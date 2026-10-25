"""add FK accounts.user_id -> users.id

Revision ID: c9f1a2b3d4e5
Revises: bfd82e1fc84b
Create Date: 2026-07-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9f1a2b3d4e5'
down_revision: Union[str, Sequence[str], None] = 'bfd82e1fc84b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add a foreign key so accounts.user_id must reference an existing user."""
    op.create_foreign_key(
        "fk_accounts_user_id_users",  # constraint name
        "accounts",                    # source table
        "users",                       # target table
        ["user_id"],                   # source column(s)
        ["id"],                        # target column(s)
    )


def downgrade() -> None:
    """Remove the foreign key."""
    op.drop_constraint(
        "fk_accounts_user_id_users",
        "accounts",
        type_="foreignkey",
    )
