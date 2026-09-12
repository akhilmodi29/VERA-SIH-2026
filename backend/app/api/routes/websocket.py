import logging
import time
import base64
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from typing import Optional
import tempfile
import os
import librosa
from app.db.database import get_db
from app.services import session_service
from app.services import voice_integrity_service
from app.services import asr_service
from app.services import intent_service
from app.services import action_context_service
from app.services import risk_fusion_service
from app.services import policy_service

logger = logging.getLogger("vera.websocket")

router = APIRouter()

def get_risk_weight(risk_level: str) -> int:
    mapping = {"low": 0, "medium": 1, "high": 2, "critical": 3}
    return mapping.get(risk_level.lower(), 0) if risk_level else 0

@router.websocket("/api/v1/ws/sessions/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    profile_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    db_session = session_service.get_session(db=db, session_id=session_id)
    if db_session is None:
        await websocket.close(code=1008, reason="Session not found")
        return
        
    await websocket.accept()
    
    buffer = bytearray()
    PROCESS_THRESHOLD = 100000 
    
    processed_chunk_ids = set()
    current_max_risk = db_session.risk_level or "low"
    
    async def process_audio_payload(audio_bytes: bytes, chunk_id: Optional[int] = None):
        nonlocal current_max_risk
        temp_audio_path = None
        try:
            if not audio_bytes or len(audio_bytes) < 4000:
                raise ValueError("Audio chunk is empty or too short")
                
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
                temp_audio.write(audio_bytes)
                temp_audio_path = temp_audio.name
            
            try:
                t0 = time.perf_counter()
                y, sr = librosa.load(temp_audio_path, sr=16000, mono=True)
                t1 = time.perf_counter()
            except Exception as e:
                raise ValueError(f"Invalid WAV or audio format: {str(e)}")
            
            voice_result = voice_integrity_service.analyze_voice(y, sr)
            t2 = time.perf_counter()
            
            if voice_result.get("state") == "NO_SPEECH":
                response = {
                    "session_id": session_id,
                    "transcript": "",
                    "voice_integrity_score": None,
                    "speaker_similarity_score": None,
                    "overall_risk_score": None,
                    "risk_level": current_max_risk,
                    "decision": "neutral",
                    "signals": [],
                    "state": "NO_SPEECH"
                }
                if chunk_id is not None:
                    response["chunk_id"] = chunk_id
                await websocket.send_json(response)
                return

            asr_result = asr_service.transcribe_audio(y, sr)
            t3 = time.perf_counter()
            
            transcript = asr_result.get("transcript", "")
            
            intent_result = intent_service.analyze_intent(transcript)
            t4 = time.perf_counter()
            
            action_context_result = action_context_service.analyze_action_context(transcript, intent_result)
            t5 = time.perf_counter()
            
            risk_result = risk_fusion_service.calculate_risk(
                voice_analysis=voice_result,
                intent_analysis=intent_result,
                action_context_analysis=action_context_result
            )
            t6 = time.perf_counter()
            
            logger.info(f"LATENCY ANALYSIS [chunk={chunk_id}]: "
                        f"librosa={t1-t0:.3f}s, "
                        f"voice_integrity={t2-t1:.3f}s, "
                        f"asr={t3-t2:.3f}s, "
                        f"intent={t4-t3:.3f}s, "
                        f"action={t5-t4:.3f}s, "
                        f"risk={t6-t5:.3f}s, "
                        f"TOTAL={t6-t0:.3f}s")

            
            chunk_risk = risk_result.get("risk_level", "low")
            if get_risk_weight(chunk_risk) > get_risk_weight(current_max_risk):
                current_max_risk = chunk_risk
                
            reported_risk_level = current_max_risk
            
            modified_risk_result = dict(risk_result)
            modified_risk_result["risk_level"] = reported_risk_level
            
            policy_result = policy_service.evaluate_policy(modified_risk_result, action_context_result)
            
            session_service.update_session(db, session_id, {
                "risk_level": reported_risk_level,
                "decision": policy_result.get("decision")
            })
            
            response = {
                "session_id": session_id,
                "transcript": transcript,
                "voice_integrity_score": voice_result.get("voice_integrity_score"),
                "speaker_similarity_score": None,
                "overall_risk_score": risk_result.get("overall_risk_score"),
                "risk_level": reported_risk_level,
                "decision": policy_result.get("decision"),
                "signals": risk_result.get("contributing_signals", [])
            }
            if chunk_id is not None:
                response["chunk_id"] = chunk_id
                
            await websocket.send_json(response)
            
        except Exception as e:
            err_msg = str(e)
            resp = {"error": f"Audio parsing or processing failed: {err_msg}", "session_id": session_id}
            if chunk_id is not None:
                resp["chunk_id"] = chunk_id
            await websocket.send_json(resp)
        finally:
            if temp_audio_path and os.path.exists(temp_audio_path):
                os.remove(temp_audio_path)

    try:
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                break
                
            if "text" in message and message["text"]:
                try:
                    data = json.loads(message["text"])
                    chunk_id = data.get("chunk_id")
                    
                    if chunk_id is None:
                        await websocket.send_json({"error": "Missing chunk_id in JSON payload", "session_id": session_id})
                        continue
                        
                    if chunk_id in processed_chunk_ids:
                        await websocket.send_json({"error": "Duplicate chunk_id", "session_id": session_id, "chunk_id": chunk_id})
                        continue
                        
                    processed_chunk_ids.add(chunk_id)
                    
                    audio_b64 = data.get("audio_data")
                    if not audio_b64:
                        await websocket.send_json({"error": "Missing audio_data in JSON payload", "session_id": session_id, "chunk_id": chunk_id})
                        continue
                        
                    try:
                        audio_bytes = base64.b64decode(audio_b64)
                    except Exception:
                        await websocket.send_json({"error": "Invalid base64 encoding for audio_data", "session_id": session_id, "chunk_id": chunk_id})
                        continue
                        
                    await process_audio_payload(audio_bytes, chunk_id=chunk_id)
                    
                except json.JSONDecodeError:
                    await websocket.send_json({"error": "Malformed JSON payload", "session_id": session_id})
                    
            elif "bytes" in message and message["bytes"]:
                buffer.extend(message["bytes"])
                if len(buffer) >= PROCESS_THRESHOLD:
                    audio_bytes = bytes(buffer)
                    buffer.clear()
                    await process_audio_payload(audio_bytes)
                    
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for session %s", session_id)
