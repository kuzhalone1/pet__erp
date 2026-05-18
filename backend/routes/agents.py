"""routes/agents.py — Agent / Referral Master CRUD"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from database import get_db
from models.agents import Agent
from models.masters import City
from schemas.agents import AgentCreate, AgentUpdate, AgentOut
from utils.doc_sequence import get_next_doc_no
from utils.gl_utils import create_gl_account

router = APIRouter(prefix="/agents", tags=["Agents"])


def _enrich(agent: Agent, db: Session) -> AgentOut:
    """Attach city_name to Agent ORM object before returning."""
    out = AgentOut.model_validate(agent)
    if agent.city_id:
        city = db.query(City).filter(City.city_id == agent.city_id).first()
        out.city_name = city.city_name if city else None
    return out


@router.get("", response_model=List[AgentOut])
def list_agents(
    search: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db)
):
    q = db.query(Agent)
    if not include_inactive:
        q = q.filter(Agent.is_active == True)
    if search:
        q = q.filter(
            Agent.name.ilike(f"%{search}%") |
            Agent.phone.ilike(f"%{search}%") |
            Agent.agent_code.ilike(f"%{search}%")
        )
    agents = q.order_by(Agent.name).all()
    return [_enrich(a, db) for a in agents]


@router.get("/{agent_id}", response_model=AgentOut)
def get_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.agent_id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return _enrich(agent, db)


@router.post("", response_model=AgentOut)
def create_agent(data: AgentCreate, db: Session = Depends(get_db)):
    payload = data.model_dump()
    if not payload.get("agent_code"):
        payload["agent_code"] = get_next_doc_no(db, "AGT")
    
    # Auto-create GL Account
    gl_id = create_gl_account("agent", data.name, db, **data.model_dump(exclude={"name"}))
    payload["gl_account_id"] = gl_id
    
    agent = Agent(**payload)
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return _enrich(agent, db)


@router.put("/{agent_id}", response_model=AgentOut)
def update_agent(agent_id: int, data: AgentUpdate, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.agent_id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(agent, k, v)
    db.commit()
    db.refresh(agent)
    return _enrich(agent, db)


@router.delete("/{agent_id}")
def deactivate_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.agent_id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.is_active = False
    db.commit()
    return {"message": "Agent deactivated"}


@router.put("/{agent_id}/reactivate", response_model=AgentOut)
def reactivate_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.agent_id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.is_active = True
    db.commit()
    db.refresh(agent)
    return _enrich(agent, db)
