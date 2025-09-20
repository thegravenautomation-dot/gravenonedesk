-- Create AI interactions table for learning and tracking
CREATE TABLE IF NOT EXISTS public.ai_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  context TEXT NOT NULL DEFAULT 'general',
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for AI interactions
CREATE POLICY "Users can view their own AI interactions"
ON public.ai_interactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI interactions"
ON public.ai_interactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_ai_interactions_user_id ON public.ai_interactions(user_id);
CREATE INDEX idx_ai_interactions_branch_id ON public.ai_interactions(branch_id);
CREATE INDEX idx_ai_interactions_context ON public.ai_interactions(context);
CREATE INDEX idx_ai_interactions_created_at ON public.ai_interactions(created_at);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_interactions_updated_at
BEFORE UPDATE ON public.ai_interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();