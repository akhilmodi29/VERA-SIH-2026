import numpy as np

_extractor = None
_model = None
_device = None

def get_model():
    global _extractor, _model, _device
    if _model is None:
        import torch
        from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
        
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model_id = "MelodyMachine/Deepfake-Audio-Detection-V2"
        
        _extractor = AutoFeatureExtractor.from_pretrained(model_id)
        _model = AutoModelForAudioClassification.from_pretrained(model_id)
        _model.to(_device)
        _model.eval()
    return _extractor, _model, _device

def analyze_voice(audio_array: np.ndarray, sample_rate: int = 16000) -> dict:
    import librosa
    
    rms_energy = float(np.sqrt(np.mean(audio_array**2)))
    intervals = librosa.effects.split(audio_array, top_db=40)
    
    if len(intervals) == 0 or rms_energy < 0.001 or len(audio_array) == 0:
        return {
            "state": "NO_SPEECH",
            "voice_integrity_score": None,
            "spoof_signal": None,
            "calibrated_spoof_probability": None,
            "calibrated_bona_fide_probability": None,
            "label": None,
            "confidence": None,
            "model_id": "MelodyMachine/Deepfake-audio-detection-V2",
            "decision": None
        }
        
    if len(audio_array) < 400:
        audio_array = np.pad(audio_array, (0, 400 - len(audio_array)), 'constant')
        
    extractor, model, device = get_model()
    import torch

    inputs = extractor(audio_array, sampling_rate=sample_rate, return_tensors="pt", padding=True)
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    with torch.no_grad():
        logits = model(**inputs).logits
        probs = torch.softmax(logits, dim=-1)
        
    fake_prob = float(probs[0, 0].item())
    real_prob = float(probs[0, 1].item())
    
    is_fake = fake_prob >= 0.5
    label = "synthetic" if is_fake else "genuine"
    confidence = fake_prob if is_fake else real_prob
    
    return {
        "state": "SPEECH_DETECTED",
        "voice_integrity_score": round(real_prob * 100, 2),
        "spoof_signal": round(fake_prob * 100, 2),
        "calibrated_spoof_probability": fake_prob,
        "calibrated_bona_fide_probability": real_prob,
        "label": label,
        "confidence": confidence,
        "model_id": "MelodyMachine/Deepfake-audio-detection-V2",
        "decision": "BLOCK" if is_fake else "ALLOW"
    }
