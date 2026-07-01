from app.api._resource_router import make_resource_router
from app.db.models.cell_line import CellLine
from app.schemas.cell_line import CellLineCreate, CellLineListItem, CellLineRead, CellLineUpdate

router = make_resource_router(
    prefix="/api/cell-lines",
    tag="cell-lines",
    Model=CellLine,
    CreateSchema=CellLineCreate,
    UpdateSchema=CellLineUpdate,
    ReadSchema=CellLineRead,
    ListItemSchema=CellLineListItem,
    search_fields=[CellLine.code, CellLine.name],
)
