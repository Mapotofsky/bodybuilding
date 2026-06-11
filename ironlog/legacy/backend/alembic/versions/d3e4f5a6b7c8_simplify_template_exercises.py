"""simplify_template_exercises

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-03-31 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, None] = 'c2d3e4f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('template_exercises', 'superset_group')
    op.drop_column('template_exercises', 'target_sets')
    op.drop_column('template_exercises', 'target_reps')
    op.drop_column('template_exercises', 'target_weight')
    op.drop_column('template_exercises', 'target_rpe')


def downgrade() -> None:
    op.add_column('template_exercises', sa.Column('target_rpe', sa.Float(), nullable=True))
    op.add_column('template_exercises', sa.Column('target_weight', sa.Float(), nullable=True))
    op.add_column('template_exercises', sa.Column('target_reps', sa.String(20), server_default='8-12', nullable=False))
    op.add_column('template_exercises', sa.Column('target_sets', sa.Integer(), server_default='3', nullable=False))
    op.add_column('template_exercises', sa.Column('superset_group', sa.Integer(), nullable=True))
