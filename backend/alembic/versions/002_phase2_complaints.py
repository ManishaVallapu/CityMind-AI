"""Phase 2 database schema (complaints, complaint_status_history, complaint_attachments)

Revision ID: 002_phase2_complaints
Revises: 001_initial_phase1_schema
Create Date: 2026-10-07 11:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "002_phase2_complaints"
down_revision: Union[str, None] = "001_initial_phase1_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Complaints table
    op.create_table(
        "complaints",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("ticket_number", sa.String(length=50), nullable=False),
        sa.Column("citizen_id", sa.Uuid(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("assigned_officer_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="SUBMITTED"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["category_id"], ["complaint_categories.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["citizen_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["assigned_officer_id"], ["officers.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_complaints_ticket_number"), "complaints", ["ticket_number"], unique=True)
    op.create_index(op.f("ix_complaints_citizen_id"), "complaints", ["citizen_id"], unique=False)
    op.create_index(op.f("ix_complaints_category_id"), "complaints", ["category_id"], unique=False)
    op.create_index(op.f("ix_complaints_assigned_officer_id"), "complaints", ["assigned_officer_id"], unique=False)
    op.create_index(op.f("ix_complaints_status"), "complaints", ["status"], unique=False)
    op.create_index(op.f("ix_complaints_created_at"), "complaints", ["created_at"], unique=False)

    # 2. Complaint Status History table
    op.create_table(
        "complaint_status_history",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("complaint_id", sa.Uuid(), nullable=False),
        sa.Column("old_status", sa.String(length=30), nullable=True),
        sa.Column("new_status", sa.String(length=30), nullable=False),
        sa.Column("changed_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["changed_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["complaint_id"], ["complaints.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_complaint_status_history_complaint_id"), "complaint_status_history", ["complaint_id"], unique=False)
    op.create_index(op.f("ix_complaint_status_history_changed_by_user_id"), "complaint_status_history", ["changed_by_user_id"], unique=False)
    op.create_index(op.f("ix_complaint_status_history_created_at"), "complaint_status_history", ["created_at"], unique=False)

    # 3. Complaint Attachments table
    op.create_table(
        "complaint_attachments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("complaint_id", sa.Uuid(), nullable=False),
        sa.Column("uploaded_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("stored_filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("storage_path", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["complaint_id"], ["complaints.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_complaint_attachments_complaint_id"), "complaint_attachments", ["complaint_id"], unique=False)
    op.create_index(op.f("ix_complaint_attachments_uploaded_by_user_id"), "complaint_attachments", ["uploaded_by_user_id"], unique=False)
    op.create_index(op.f("ix_complaint_attachments_stored_filename"), "complaint_attachments", ["stored_filename"], unique=True)
    op.create_index(op.f("ix_complaint_attachments_created_at"), "complaint_attachments", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_table("complaint_attachments")
    op.drop_table("complaint_status_history")
    op.drop_table("complaints")
