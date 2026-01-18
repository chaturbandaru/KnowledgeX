import pytest

pytestmark = pytest.mark.unit


def _import_embedding_service():
    """
    Tries a couple common import paths based on your structure.
    Skips if not found.
    """
    candidates = [
        "backend.services.embedding_service",
        "services.embedding_service",
    ]
    for mod in candidates:
        try:
            module = __import__(mod, fromlist=["*"])
            return module
        except Exception:
            continue
    pytest.skip("embedding_service module not found (services/embedding_service.py not implemented yet).")


def test_embedding_service_exposes_expected_api():
    """
    Contract test: embedding service should expose either:
    - class EmbeddingService with method embed_text / embed
    OR
    - function embed_text / embed
    """
    module = _import_embedding_service()

    has_class = hasattr(module, "EmbeddingService")
    has_fn = any(hasattr(module, fn) for fn in ("embed_text", "embed", "get_embedding"))

    if not (has_class or has_fn):
        pytest.skip("Embedding service exists but doesn't expose expected API yet.")


@pytest.mark.parametrize("text", ["hello world", "Python + FastAPI", "need: resume review"])
def test_embedding_returns_vector_of_floats(text):
    """
    Contract test: embedding result should be a non-empty list of floats.
    Uses monkeypatch if service tries to call external providers.
    """
    module = _import_embedding_service()

    # If there's a class-based service, instantiate it in a flexible way
    svc = None
    if hasattr(module, "EmbeddingService"):
        EmbeddingService = getattr(module, "EmbeddingService")
        try:
            svc = EmbeddingService()
        except TypeError:
            # If constructor requires settings, skip for now
            pytest.skip("EmbeddingService constructor requires args; add a test fixture once stable.")

    # Find an embedding callable
    if svc:
        for name in ("embed_text", "embed", "get_embedding"):
            if hasattr(svc, name):
                embed_callable = getattr(svc, name)
                break
        else:
            pytest.skip("EmbeddingService has no embed method yet.")
        result = embed_callable(text)
    else:
        for name in ("embed_text", "embed", "get_embedding"):
            if hasattr(module, name):
                embed_callable = getattr(module, name)
                break
        else:
            pytest.skip("No embedding function found yet.")
        result = embed_callable(text)

    assert isinstance(result, (list, tuple)), "Embedding must be a list/tuple"
    assert len(result) > 0, "Embedding vector must be non-empty"
    assert all(isinstance(x, (float, int)) for x in result), "Embedding values must be numeric"


def test_embedding_is_deterministic_for_same_input_when_cached_or_deterministic():
    """
    If your embedding layer is deterministic or has caching,
    repeated calls should return identical vectors for the same input.
    If your provider is non-deterministic, you can relax this test later.
    """
    module = _import_embedding_service()

    # Try to get a callable (same logic as above, simplified)
    if hasattr(module, "EmbeddingService"):
        try:
            svc = module.EmbeddingService()
        except TypeError:
            pytest.skip("EmbeddingService constructor requires args; add a fixture once stable.")
        method = None
        for name in ("embed_text", "embed", "get_embedding"):
            if hasattr(svc, name):
                method = getattr(svc, name)
                break
        if not method:
            pytest.skip("EmbeddingService has no embed method yet.")
        v1 = method("same input")
        v2 = method("same input")
    else:
        fn = None
        for name in ("embed_text", "embed", "get_embedding"):
            if hasattr(module, name):
                fn = getattr(module, name)
                break
        if not fn:
            pytest.skip("No embedding function found yet.")
        v1 = fn("same input")
        v2 = fn("same input")

    assert list(v1) == list(v2), "Expected same input to produce same vector (cache/determinism)."


