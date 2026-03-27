"""
RAG Pipeline: Sentence-Transformers + FAISS for similar ticket retrieval.
Loads the CSV knowledge base at startup, builds FAISS index, retrieves top-k similar tickets.
"""
import os
import pickle
import numpy as np
import pandas as pd
from typing import List, Dict, Any

import os
# Set these BEFORE importing sentence_transformers
os.environ["HF_HUB_READ_TIMEOUT"] = "120"
os.environ["HF_HUB_OFFLINE"] = "0"
# (Optional) Use a mirror if main hf is blocked
# os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

# Lazy imports for heavy dependencies
_model = None
_index = None
_kb_df = None
_embeddings = None

FAISS_INDEX_PATH = "./data/faiss_index.pkl"
EMBEDDINGS_PATH = "./data/embeddings.pkl"
CSV_PATH = "./data/tickets.csv"
TOP_K = 5


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        print("Loading sentence-transformer model (all-MiniLM-L6-v2)...")
        try:
            _model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as e:
            print(f"Error loading model: {e}")
            print("Trying fallback model (paraphrase-MiniLM-L3-v2)...")
            _model = SentenceTransformer("paraphrase-MiniLM-L3-v2")
        print("Model loaded.")
    return _model


def build_index(force: bool = False):
    """Build or load FAISS index from knowledge base CSV."""
    global _index, _kb_df, _embeddings

    os.makedirs("./data", exist_ok=True)

    if not os.path.exists(CSV_PATH):
        print(f"WARNING: {CSV_PATH} not found. RAG disabled until data loaded.")
        return False

    _kb_df = pd.read_csv(CSV_PATH)
    # Only use resolved tickets for RAG
    resolved = _kb_df[_kb_df["status"] == "resolved"].reset_index(drop=True)
    _kb_df = resolved

    if _kb_df.empty:
        print("No resolved tickets found for RAG indexing.")
        return False

    if not force and os.path.exists(FAISS_INDEX_PATH) and os.path.exists(EMBEDDINGS_PATH):
        print("Loading cached FAISS index...")
        with open(FAISS_INDEX_PATH, "rb") as f:
            _index = pickle.load(f)
        with open(EMBEDDINGS_PATH, "rb") as f:
            _embeddings = pickle.load(f)
        print(f"FAISS index loaded: {_index.ntotal} vectors.")
        return True

    print(f"Building FAISS index from {len(_kb_df)} resolved tickets...")
    model = _get_model()
    texts = (_kb_df["title"] + " " + _kb_df["description"]).tolist()
    _embeddings = model.encode(texts, show_progress_bar=True, batch_size=64)

    import faiss
    dim = _embeddings.shape[1]
    _index = faiss.IndexFlatIP(dim)
    # Normalize for cosine similarity
    norms = np.linalg.norm(_embeddings, axis=1, keepdims=True)
    normed = _embeddings / (norms + 1e-9)
    _index.add(normed.astype(np.float32))

    with open(FAISS_INDEX_PATH, "wb") as f:
        pickle.dump(_index, f)
    with open(EMBEDDINGS_PATH, "wb") as f:
        pickle.dump(_embeddings, f)

    print(f"FAISS index built: {_index.ntotal} vectors.")
    return True


def retrieve_similar(title: str, description: str, top_k: int = TOP_K) -> List[Dict[str, Any]]:
    """Retrieve top_k similar resolved tickets from knowledge base."""
    global _index, _kb_df

    if _index is None or _kb_df is None:
        return []

    model = _get_model()
    query_text = title + " " + description
    query_emb = model.encode([query_text])
    norm = np.linalg.norm(query_emb, axis=1, keepdims=True)
    query_norm = (query_emb / (norm + 1e-9)).astype(np.float32)

    import faiss
    D, I = _index.search(query_norm, top_k + 1)

    results = []
    for score, idx in zip(D[0], I[0]):
        if idx < 0 or idx >= len(_kb_df):
            continue
        row = _kb_df.iloc[idx]
        results.append({
            "ticket_id": str(row.get("ticket_id", f"TKT-{idx}")),
            "title": str(row.get("title", "")),
            "category": str(row.get("category", "")),
            "similarity": round(float(score) * 100, 1),
            "resolution": str(row.get("resolution", "")),
        })
    return results[:top_k]


def check_duplicate(title: str, description: str, threshold: float = 90.0) -> tuple:
    """Check if this ticket is a duplicate of an existing one (very high similarity)."""
    results = retrieve_similar(title, description, top_k=1)
    if results and results[0]["similarity"] >= threshold:
        return True, results[0]["ticket_id"]
    return False, ""


def get_best_resolution(similar_tickets: List[Dict]) -> str:
    """Get the resolution from the most similar ticket."""
    if not similar_tickets:
        return ""
    best = max(similar_tickets, key=lambda x: x["similarity"])
    return best.get("resolution", "")


def add_to_index(ticket_id: str, title: str, description: str, resolution: str, category: str, priority: str):
    """Add a newly resolved ticket to the FAISS index and CSV knowledge base."""
    global _index, _kb_df, _embeddings

    import faiss

    if _index is None or _kb_df is None:
        return

    new_row = {
        "ticket_id": ticket_id, "title": title, "description": description,
        "category": category, "priority": priority, "status": "resolved",
        "resolution": resolution, "created_at": "", "assigned_agent": "",
    }
    _kb_df = pd.concat([_kb_df, pd.DataFrame([new_row])], ignore_index=True)

    model = _get_model()
    new_emb = model.encode([title + " " + description]).astype(np.float32)
    norm = np.linalg.norm(new_emb, axis=1, keepdims=True)
    new_emb_norm = new_emb / (norm + 1e-9)
    _index.add(new_emb_norm)

    # Persist updated CSV
    _kb_df.to_csv(CSV_PATH, index=False)
    print(f"Added TKT {ticket_id} to knowledge base. Total: {_index.ntotal}")
