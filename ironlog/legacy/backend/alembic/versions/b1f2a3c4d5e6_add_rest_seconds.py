"""add rest_seconds to workout_sets

Revision ID: b1f2a3c4d5e6
Revises: aaa626c81eb1
Create Date: 2026-03-27 13:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1f2a3c4d5e6'
down_revision: Union[str, None] = 'aaa626c81eb1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('workout_sets', sa.Column('rest_seconds', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('workout_sets', 'rest_seconds')
