from app.api._resource_router import make_resource_router
from app.db.models.primer import Primer
from app.schemas.primer import PrimerCreate, PrimerListItem, PrimerRead, PrimerUpdate

router = make_resource_router(
    prefix="/api/primers",
    tag="primers",
    Model=Primer,
    CreateSchema=PrimerCreate,
    UpdateSchema=PrimerUpdate,
    ReadSchema=PrimerRead,
    ListItemSchema=PrimerListItem,
    search_fields=[Primer.code, Primer.name],
    has_status=False,
)
