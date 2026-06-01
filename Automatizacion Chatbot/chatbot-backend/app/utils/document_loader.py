from pathlib import Path


def list_knowledge_documents(base_path: str = "data/knowledge_base") -> list[str]:
    root = Path(base_path)
    if not root.exists():
        return []
    return [str(p) for p in root.rglob("*") if p.is_file()]
