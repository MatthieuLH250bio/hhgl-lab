# Importe tous les modèles ici pour qu'Alembic les détecte lors des migrations
from app.db.models.user import User  # noqa: F401
from app.db.models.plasmid import Plasmid, PlasmidFeature  # noqa: F401
from app.db.models.strain import Strain  # noqa: F401
from app.db.models.cell_line import CellLine  # noqa: F401
from app.db.models.primer import Primer  # noqa: F401
from app.db.models.antibody import Antibody  # noqa: F401
from app.db.models.virus import Virus  # noqa: F401
from app.db.models.notebook import Project, Experiment, NotebookEntry, EntryResult, EntryAttachment  # noqa: F401
from app.db.models.bibliography import BibCollection, Reference  # noqa: F401
from app.db.models.protocols import Protocol, ProtocolVersion  # noqa: F401

__all__ = [
    "User", "Plasmid", "PlasmidFeature", "Strain", "CellLine", "Primer", "Antibody", "Virus",
    "Project", "Experiment", "NotebookEntry", "EntryResult", "EntryAttachment",
    "Reference", "BibCollection",
    "Protocol", "ProtocolVersion",
]
