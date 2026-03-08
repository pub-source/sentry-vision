
-- Detection sessions table
CREATE TABLE public.detection_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds NUMERIC,
  avg_attention NUMERIC,
  max_attention NUMERIC,
  avg_saliency NUMERIC,
  total_objects_detected INTEGER DEFAULT 0,
  total_alerts INTEGER DEFAULT 0,
  saliency_mode TEXT DEFAULT 'sobel',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Detection data points within sessions
CREATE TABLE public.detection_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.detection_sessions(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  attention_score NUMERIC,
  saliency_score NUMERIC,
  decibel NUMERIC,
  speech_detected BOOLEAN DEFAULT false,
  object_count INTEGER DEFAULT 0,
  objects_detected JSONB DEFAULT '[]'::jsonb,
  audio_event TEXT DEFAULT 'none',
  fps NUMERIC
);

-- Detected objects log
CREATE TABLE public.detected_objects_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.detection_sessions(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  label TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  bbox JSONB
);

-- Enable RLS
ALTER TABLE public.detection_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detection_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detected_objects_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for detection_sessions
CREATE POLICY "Users can view own sessions" ON public.detection_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create sessions" ON public.detection_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sessions" ON public.detection_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- RLS policies for detection_data
CREATE POLICY "Users can view own data" ON public.detection_data FOR SELECT TO authenticated USING (session_id IN (SELECT id FROM public.detection_sessions WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own data" ON public.detection_data FOR INSERT TO authenticated WITH CHECK (session_id IN (SELECT id FROM public.detection_sessions WHERE user_id = auth.uid()));

-- RLS policies for detected_objects_log
CREATE POLICY "Users can view own objects" ON public.detected_objects_log FOR SELECT TO authenticated USING (session_id IN (SELECT id FROM public.detection_sessions WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own objects" ON public.detected_objects_log FOR INSERT TO authenticated WITH CHECK (session_id IN (SELECT id FROM public.detection_sessions WHERE user_id = auth.uid()));
