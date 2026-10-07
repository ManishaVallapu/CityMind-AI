from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.department import Department


class ComplaintCategory(Base):
    """
    Municipal complaint category entity.
    
    NOTE: target_department_id is strictly a static default/reference fallback mapping.
    It is NOT the intelligent department recommendation system; dynamic AI-driven
    department recommendation will be performed by the ML inference pipeline in later phases.
    """
    __tablename__ = "complaint_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    default_sla_hours: Mapped[int] = mapped_column(Integer, default=72, nullable=False)
    default_priority: Mapped[str] = mapped_column(String(20), default="MEDIUM", nullable=False)
    
    # Reference/Default Department Mapping (Fallback only, NOT intelligent ML routing)
    target_department_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    target_department: Mapped[Optional["Department"]] = relationship(
        "Department", back_populates="default_categories"
    )

    def __repr__(self) -> str:
        return f"<ComplaintCategory id={self.id} slug='{self.slug}' name='{self.name}'>"
