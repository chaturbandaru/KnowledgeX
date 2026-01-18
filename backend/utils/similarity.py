"""
Similarity computation utilities for vector embeddings.
Provides cosine similarity and related vector operations.
"""

import numpy as np
from typing import List, Tuple, Sequence
import logging

logger = logging.getLogger(__name__)


def cosine_similarity(vec_a: Sequence[float], vec_b: Sequence[float]) -> float:
    """
    Compute cosine similarity between two vectors.
    
    Returns value in range [-1, 1]:
    - 1.0 = identical direction
    - 0.0 = orthogonal
    - -1.0 = opposite direction
    
    Args:
        vec_a: First vector
        vec_b: Second vector
        
    Returns:
        Cosine similarity score
        
    Raises:
        ValueError: If vectors have different dimensions or are empty
    """
    if len(vec_a) == 0 or len(vec_b) == 0:
        raise ValueError("Vectors cannot be empty")
    
    if len(vec_a) != len(vec_b):
        raise ValueError(f"Vector dimension mismatch: {len(vec_a)} vs {len(vec_b)}")
    
    # Convert to numpy arrays
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    
    # Compute norms
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    
    # Handle zero vectors
    if norm_a == 0.0 or norm_b == 0.0:
        logger.warning("Zero vector detected in cosine similarity computation")
        return 0.0
    
    # Compute cosine similarity
    similarity = float(np.dot(a, b) / (norm_a * norm_b))
    
    # Clamp to [-1, 1] to handle floating point errors
    return max(-1.0, min(1.0, similarity))


def batch_cosine_similarity(
    query_vec: Sequence[float],
    corpus_vecs: List[Sequence[float]],
    top_k: int = 10
) -> List[Tuple[int, float]]:
    """
    Compute cosine similarity between a query vector and a corpus of vectors.
    Returns top-K most similar vectors.
    
    Args:
        query_vec: Query vector
        corpus_vecs: List of corpus vectors to compare against
        top_k: Number of top results to return
        
    Returns:
        List of (index, similarity_score) tuples, sorted by score descending
    """
    if not corpus_vecs:
        return []
    
    query = np.array(query_vec, dtype=np.float32)
    query_norm = np.linalg.norm(query)
    
    if query_norm == 0.0:
        logger.warning("Query vector is zero vector")
        return [(i, 0.0) for i in range(min(top_k, len(corpus_vecs)))]
    
    # Normalize query vector
    query_normalized = query / query_norm
    
    # Compute similarities for all corpus vectors
    similarities = []
    for idx, corpus_vec in enumerate(corpus_vecs):
        corpus = np.array(corpus_vec, dtype=np.float32)
        corpus_norm = np.linalg.norm(corpus)
        
        if corpus_norm == 0.0:
            similarities.append((idx, 0.0))
        else:
            corpus_normalized = corpus / corpus_norm
            sim = float(np.dot(query_normalized, corpus_normalized))
            similarities.append((idx, max(-1.0, min(1.0, sim))))
    
    # Sort by similarity (descending) and return top-K
    similarities.sort(key=lambda x: x[1], reverse=True)
    return similarities[:top_k]


def normalize_vector(vec: Sequence[float]) -> List[float]:
    """
    Normalize a vector to unit length.
    
    Args:
        vec: Input vector
        
    Returns:
        Normalized vector (L2 norm = 1)
    """
    arr = np.array(vec, dtype=np.float32)
    norm = np.linalg.norm(arr)
    
    if norm == 0.0:
        logger.warning("Cannot normalize zero vector")
        return [0.0] * len(vec)
    
    normalized = arr / norm
    return normalized.tolist()


def vector_magnitude(vec: Sequence[float]) -> float:
    """
    Compute the L2 norm (magnitude) of a vector.
    
    Args:
        vec: Input vector
        
    Returns:
        L2 norm
    """
    arr = np.array(vec, dtype=np.float32)
    return float(np.linalg.norm(arr))


def euclidean_distance(vec_a: Sequence[float], vec_b: Sequence[float]) -> float:
    """
    Compute Euclidean distance between two vectors.
    
    Args:
        vec_a: First vector
        vec_b: Second vector
        
    Returns:
        Euclidean distance
        
    Raises:
        ValueError: If vectors have different dimensions
    """
    if len(vec_a) != len(vec_b):
        raise ValueError(f"Vector dimension mismatch: {len(vec_a)} vs {len(vec_b)}")
    
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    
    return float(np.linalg.norm(a - b))


def average_vectors(vectors: List[Sequence[float]]) -> List[float]:
    """
    Compute the average of multiple vectors.
    Useful for combining skill embeddings.
    
    Args:
        vectors: List of vectors to average
        
    Returns:
        Average vector
        
    Raises:
        ValueError: If vectors list is empty or vectors have different dimensions
    """
    if not vectors:
        raise ValueError("Cannot average empty list of vectors")
    
    # Convert all to numpy arrays
    arrays = [np.array(v, dtype=np.float32) for v in vectors]
    
    # Check dimensions
    dim = len(arrays[0])
    if not all(len(arr) == dim for arr in arrays):
        raise ValueError("All vectors must have the same dimension")
    
    # Compute average
    avg = np.mean(arrays, axis=0)
    return avg.tolist()


def weighted_average_vectors(
    vectors: List[Sequence[float]],
    weights: List[float]
) -> List[float]:
    """
    Compute weighted average of vectors.
    
    Args:
        vectors: List of vectors
        weights: Corresponding weights (will be normalized)
        
    Returns:
        Weighted average vector
        
    Raises:
        ValueError: If vectors and weights have different lengths
    """
    if len(vectors) != len(weights):
        raise ValueError("Number of vectors must match number of weights")
    
    if not vectors:
        raise ValueError("Cannot average empty list of vectors")
    
    # Normalize weights
    weight_sum = sum(weights)
    if weight_sum == 0:
        raise ValueError("Sum of weights cannot be zero")
    
    normalized_weights = [w / weight_sum for w in weights]
    
    # Convert to numpy
    arrays = [np.array(v, dtype=np.float32) for v in vectors]
    weights_arr = np.array(normalized_weights, dtype=np.float32)
    
    # Compute weighted average
    weighted_avg = np.average(arrays, axis=0, weights=weights_arr)
    return weighted_avg.tolist()