-- Create bakeries table
CREATE TABLE public.bakeries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bakeries
ALTER TABLE public.bakeries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bakeries
CREATE POLICY "Users can view their own bakeries"
  ON public.bakeries FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own bakeries"
  ON public.bakeries FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own bakeries"
  ON public.bakeries FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own bakeries"
  ON public.bakeries FOR DELETE
  USING (auth.uid() = created_by);

-- Create items table
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for items
CREATE POLICY "Users can view their own items"
  ON public.items FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own items"
  ON public.items FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own items"
  ON public.items FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own items"
  ON public.items FOR DELETE
  USING (auth.uid() = created_by);

-- Create sales table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bakery_id UUID NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  bakery_name TEXT NOT NULL,
  bakery_phone TEXT NOT NULL,
  items JSONB NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'saved',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sales
CREATE POLICY "Users can view their own sales"
  ON public.sales FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own sales"
  ON public.sales FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own sales"
  ON public.sales FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own sales"
  ON public.sales FOR DELETE
  USING (auth.uid() = created_by);

-- Create indexes for better performance
CREATE INDEX idx_bakeries_created_by ON public.bakeries(created_by);
CREATE INDEX idx_bakeries_last_used_at ON public.bakeries(last_used_at DESC);
CREATE INDEX idx_items_created_by ON public.items(created_by);
CREATE INDEX idx_sales_created_by ON public.sales(created_by);
CREATE INDEX idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX idx_sales_bakery_id ON public.sales(bakery_id);