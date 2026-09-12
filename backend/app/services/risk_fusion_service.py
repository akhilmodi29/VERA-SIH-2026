def calculate_risk(voice_analysis: dict = None, intent_analysis: dict = None, action_context_analysis: dict = None) -> dict:
    signals = []
    total_weight = 0.0
    weighted_sum = 0.0
    total_confidence = 0.0
    confidence_weight = 0.0
    
    # Extract scores
    vi_score = voice_analysis.get('voice_integrity_score', 0.0) if voice_analysis else 0.0
    vi_conf = voice_analysis.get('confidence', 1.0) if voice_analysis else 1.0
    
    in_score = intent_analysis.get('social_engineering_score', 0.0) if intent_analysis else 0.0
    in_conf = intent_analysis.get('confidence', 1.0) if intent_analysis else 1.0
    intent_signals = intent_analysis.get('signals', []) if intent_analysis else []
    
    ac_score = 0.0
    ac_conf = 1.0
    ac_signals = []
    if action_context_analysis:
        ac_score = max(
            action_context_analysis.get('action_risk_score', 0.0),
            action_context_analysis.get('context_risk_score', 0.0)
        )
        ac_conf = action_context_analysis.get('confidence', 1.0)
        ac_signals = action_context_analysis.get('signals', [])

    if vi_score < 0.4:
        signals.append('high_voice_manipulation_probability')
    signals.extend(intent_signals)
    for sig in ac_signals:
        if sig not in signals:
            signals.append(sig)

    # Determine Context-Adaptive Weights
    if vi_score <= 0.3:
        # STRONG AI-GENERATED / SYNTHETIC VOICE
        w_voice = 0.70
        w_intent = 0.15
        w_action = 0.15
    elif in_score >= 0.6 or ac_score >= 0.6:
        # HIGH-STAKES FINANCIAL + SUSPICIOUS INTENT
        w_voice = 0.30
        w_intent = 0.40
        w_action = 0.30
    else:
        # NORMAL CONVERSATION
        w_voice = 0.50
        w_intent = 0.25
        w_action = 0.25

    # Apply Weights
    if voice_analysis:
        weighted_sum += (1.0 - vi_score) * w_voice
        total_weight += w_voice
        total_confidence += vi_conf * w_voice
        confidence_weight += w_voice
        
    if intent_analysis:
        weighted_sum += in_score * w_intent
        total_weight += w_intent
        total_confidence += in_conf * w_intent
        confidence_weight += w_intent
        
    if action_context_analysis:
        weighted_sum += ac_score * w_action
        total_weight += w_action
        total_confidence += ac_conf * w_action
        confidence_weight += w_action

    overall_risk_score = 0.0
    final_confidence = 0.0
    if total_weight > 0:
        overall_risk_score = min(1.0, weighted_sum / total_weight)
        final_confidence = total_confidence / confidence_weight

    # Security Escalation Rules
    
    # Check for specific dangerous combinations
    has_otp_pin = any(s in signals for s in ['request_auth_code', 'auth_credential_request', 'password_request'])
    has_money_transfer = any(s in signals for s in ['money_transfer', 'payment_request', 'account_change'])
    has_urgency = 'urgency' in signals
    
    escalated = False
    
    if has_otp_pin and has_money_transfer and has_urgency:
        overall_risk_score = max(overall_risk_score, 0.90)
        escalated = True
    elif in_score >= 0.7 and ac_score >= 0.7:
        overall_risk_score = max(overall_risk_score, 0.75)
        escalated = True
        
    if vi_score <= 0.3:
        overall_risk_score = max(overall_risk_score, 0.65)
        escalated = True

    # Demotion / Clamping
    # Genuine voice + normal conversation without suspicious behavior -> should remain LOW
    if not escalated and vi_score > 0.6 and in_score < 0.4 and ac_score < 0.4:
        overall_risk_score = min(overall_risk_score, 0.20)
        
    if overall_risk_score >= 0.85:
        risk_level = 'critical'
    elif overall_risk_score >= 0.60:
        risk_level = 'high'
    elif overall_risk_score >= 0.30:
        risk_level = 'medium'
    else:
        risk_level = 'low'

    return {
        'overall_risk_score': overall_risk_score,
        'risk_level': risk_level,
        'contributing_signals': list(set(signals)),
        'confidence': final_confidence
    }
