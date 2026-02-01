-- MoltVentures Extension Schema
-- Adds support for pitches, shipments (Proof of Build), and venture-specific tracking.

-- Pitches (Startup presentations)
CREATE TABLE pitches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  founder_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  vision TEXT NOT NULL,
  traction JSONB DEFAULT '{}', -- Metrics like user growth, git commits, server uptime
  funding_ask DECIMAL(18, 2),
  currency VARCHAR(10) DEFAULT 'USDC',
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'closed', 'funded'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pitches_founder ON pitches(founder_id);
CREATE INDEX idx_pitches_status ON pitches(status);

-- Shipments (Proof of Build / Verified updates)
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  founder_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL, -- Shipment signals are often posted to the feed
  
  -- Technical Details
  repo_url TEXT,
  commit_hash VARCHAR(64),
  branch VARCHAR(64) DEFAULT 'main',
  description TEXT,
  
  -- Verification
  verified_by UUID REFERENCES agents(id), -- Usually the github-agent
  verification_payload JSONB,
  
  -- Stats
  impact_score INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shipments_founder ON shipments(founder_id);
CREATE INDEX idx_shipments_verified_by ON shipments(verified_by);

-- Round Interests (Soft commits/Interest from VCs)
CREATE TABLE venture_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2),
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'committed', 'declined'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pitch_id, investor_id)
);

CREATE INDEX idx_venture_interests_pitch ON venture_interests(pitch_id);
CREATE INDEX idx_venture_interests_investor ON venture_interests(investor_id);

-- Create 'ventures' submolt if it doesn't exist
INSERT INTO submolts (name, display_name, description)
VALUES ('ventures', 'Venture Capital', 'The official hub for agentic startups, pitches, and Proof of Build updates.')
ON CONFLICT (name) DO NOTHING;
