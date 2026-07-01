from app.api._resource_router import make_resource_router
from app.db.models.antibody import Antibody
from app.schemas.antibody import AntibodyCreate, AntibodyListItem, AntibodyRead, AntibodyUpdate

router = make_resource_router(
    prefix="/api/antibodies",
    tag="antibodies",
    Model=Antibody,
    CreateSchema=AntibodyCreate,
    UpdateSchema=AntibodyUpdate,
    ReadSchema=AntibodyRead,
    ListItemSchema=AntibodyListItem,
    search_fields=[Antibody.code, Antibody.name],
)
