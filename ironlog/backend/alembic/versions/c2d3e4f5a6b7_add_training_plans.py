"""add_training_plans

Revision ID: c2d3e4f5a6b7
Revises: b1f2a3c4d5e6
Create Date: 2026-03-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, None] = 'b1f2a3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'training_plans',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color', sa.String(length=20), server_default='#3B82F6', nullable=False),
        sa.Column('mode', sa.Enum('weekly', 'cyclic', 'flexible', name='planmodeenum'), nullable=False),
        sa.Column('cycle_length', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_training_plans_user', 'training_plans', ['user_id'], unique=False)

    op.create_table(
        'plan_templates',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('color', sa.String(length=20), nullable=True),
        sa.Column('schedule_rule', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['plan_id'], ['training_plans.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'template_exercises',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('exercise_id', sa.Integer(), nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('superset_group', sa.Integer(), nullable=True),
        sa.Column('target_sets', sa.Integer(), server_default='3', nullable=False),
        sa.Column('target_reps', sa.String(length=20), server_default='8-12', nullable=False),
        sa.Column('target_weight', sa.Float(), nullable=True),
        sa.Column('target_rpe', sa.Float(), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['exercise_id'], ['exercises.id'], ),
        sa.ForeignKeyConstraint(['template_id'], ['plan_templates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'plan_schedule_entries',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('scheduled_date', sa.Date(), nullable=False),
        sa.Column('is_completed', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('workout_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['plan_id'], ['training_plans.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['template_id'], ['plan_templates.id'], ),
        sa.ForeignKeyConstraint(['workout_id'], ['workouts.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_schedule_entries_plan_date',
        'plan_schedule_entries',
        ['plan_id', 'scheduled_date'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('ix_schedule_entries_plan_date', table_name='plan_schedule_entries')
    op.drop_table('plan_schedule_entries')
    op.drop_table('template_exercises')
    op.drop_table('plan_templates')
    op.drop_index('ix_training_plans_user', table_name='training_plans')
    op.drop_table('training_plans')
    op.execute("DROP TYPE IF EXISTS planmodeenum")
