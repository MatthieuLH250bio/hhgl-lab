from app.api._resource_router import make_resource_router
from app.db.models.strain import Strain
from app.schemas.strain import StrainCreate, StrainListItem, StrainRead, StrainUpdate

router = make_resource_router(
    prefix="/api/strains",
    tag="strains",
    Model=Strain,
    CreateSchema=StrainCreate,
    UpdateSchema=StrainUpdate,
    ReadSchema=StrainRead,
    ListItemSchema=StrainListItem,
    search_fields=[Strain.code, Strain.name],
)
