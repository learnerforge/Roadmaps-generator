from math import ceil
from fastapi import Query
from typing import Optional


class PaginationParams:
    def __init__(
        self,
        page: int = Query(1, ge=1, description="Page number"),
        per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    ):
        self.page = page
        self.per_page = per_page
        self.offset = (page - 1) * per_page


class PaginatedResponse:
    def __init__(self, items: list, total: int, params: PaginationParams):
        self.items = items
        self.total = total
        self.page = params.page
        self.per_page = params.per_page
        self.total_pages = ceil(total / params.per_page) if params.per_page > 0 else 0
        self.has_next = params.page < self.total_pages
        self.has_prev = params.page > 1

    def dict(self) -> dict:
        return {
            "items": self.items,
            "pagination": {
                "page": self.page,
                "per_page": self.per_page,
                "total": self.total,
                "total_pages": self.total_pages,
                "has_next": self.has_next,
                "has_prev": self.has_prev,
            },
        }
