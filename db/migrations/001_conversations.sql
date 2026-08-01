-- Conversations between two users, optionally scoped to a post (used for the "message the poster" flow).
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
  user_one_email TEXT NOT NULL REFERENCES users(email),
  user_two_email TEXT NOT NULL REFERENCES users(email),
  created_at TIMESTAMP DEFAULT now(),
  CHECK (user_one_email < user_two_email)
);

-- One conversation per (post, pair of users). Callers must sort the pair before inserting.
CREATE UNIQUE INDEX conversations_post_pair_idx ON conversations (post_id, user_one_email, user_two_email);
CREATE INDEX conversations_pair_idx ON conversations (user_one_email, user_two_email);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL REFERENCES users(email),
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  read_at TIMESTAMP
);

CREATE INDEX messages_conversation_idx ON messages (conversation_id, created_at);
