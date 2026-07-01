from app.api._resource_router import make_resource_router
from app.db.models.virus import Virus
from app.schemas.virus import VirusCreate, VirusListItem, VirusRead, VirusUpdate

router = make_resource_router(
    prefix="/api/viruses",
    tag="viruses",
    Model=Virus,
    CreateSchema=VirusCreate,
    UpdateSchema=VirusUpdate,
    ReadSchema=VirusRead,
    ListItemSchema=VirusListItem,
    search_fields=[Virus.code, Virus.name],
)
