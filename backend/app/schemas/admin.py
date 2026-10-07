import uuid
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class AdminOfficerRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    badge_number: str
    designation: Optional[str] = None
    department_id: int
    department_name: Optional[str] = None
    department_code: Optional[str] = None
    is_available: bool
    full_name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class DepartmentSummary(BaseModel):
    id: int
    name: str
    code: str
    total: int
    submitted: int
    assigned: int
    in_progress: int
    resolved: int
    closed: int
    rejected: int


class CategorySummary(BaseModel):
    id: int
    name: str
    total: int


class AdminStatsResponse(BaseModel):
    total: int
    submitted: int
    assigned: int
    in_progress: int
    resolved: int
    closed: int
    rejected: int
    department_summaries: List[DepartmentSummary]
    category_summaries: List[CategorySummary]
    officers_count: int
