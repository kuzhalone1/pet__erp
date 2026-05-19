"""routes/auth.py — Login and JWT authentication with Multi-Company Discovery, Selection & RBAC Middleware"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt
import bcrypt

from database import get_db, get_master_db, get_engine_for_db, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME
from models.users import User
from models.master_sys import CompanyProfile, Tenant, MasterUser, UserModuleAccess
from schemas.auth import LoginRequest, LoginDiscoveryResponse, SelectCompanyRequest, TokenResponse, UserOut, CompanySimple
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from utils.encryption import encrypt_db_uri

router = APIRouter(prefix="", tags=["Authentication"])


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain password against a bcrypt hash."""
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))


def hash_password(plain: str) -> str:
    """Hash a plain password with bcrypt."""
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(request: Request):
    """Extracts user payload from JWT token."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Token expired or invalid")


def enforce_module_access(required_module: str):
    """FastAPI dependency middleware to enforce RBAC module access."""
    def dependency(user_payload: dict = Depends(get_current_user)):
        role = user_payload.get("role", "")
        if role == "Admin":
            return user_payload
        modules = user_payload.get("modules", [])
        if required_module not in modules:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied to module: {required_module}"
            )
        return user_payload
    return dependency


@router.post("/login", response_model=LoginDiscoveryResponse)
def login_discovery(payload: LoginRequest, master_db: Session = Depends(get_master_db)):
    """
    Step 1: Verify credentials against MasterUser or scan all active Company DBs for local branch Users.
    Discovers available companies for the authenticated user.
    """
    user_id = None
    full_name = None
    role = "Admin"
    is_active = True
    companies = []

    # Ensure default tenant exists
    tenant = master_db.query(Tenant).filter(Tenant.tenant_id == 1).first()
    if not tenant:
        tenant = Tenant(tenant_id=1, tenant_name="Default Tenant", email="admin@petclinicerp.com", password_hash="hashed_pw")
        master_db.add(tenant)
        master_db.commit()

    # 1. Check MasterUser table first (Global Admins / Tenant Owners)
    master_user = master_db.query(MasterUser).filter(MasterUser.email == payload.username).first()
    if master_user and verify_password(payload.password, master_user.password_hash):
        user_id = master_user.user_id
        full_name = master_user.full_name
        role = "Admin"
        is_active = master_user.is_active
        companies = master_db.query(CompanyProfile).filter(CompanyProfile.tenant_id == master_user.tenant_id, CompanyProfile.status == "Active").all()
    else:
        # 2. Iterate over all active companies to find the local branch User (e.g. branch doctor/receptionist)
        companies_query = master_db.query(CompanyProfile).filter(CompanyProfile.status == "Active").all()
        
        # If no companies exist yet in Master DB registry, auto-register the default pet_erp database
        if not companies_query:
            db_uri_plain = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
            encrypted_uri = encrypt_db_uri(db_uri_plain)
            default_company = CompanyProfile(
                tenant_id=1,
                company_code="DEF",
                company_name="Default Pet Clinic",
                db_name=DB_NAME,
                db_uri=encrypted_uri,
                address_line1="Main Clinic Address",
                city="Metropolis",
                state="State",
                pincode="123456",
                current_fy="2026-27",
                status="Active"
            )
            master_db.add(default_company)
            master_db.commit()
            master_db.refresh(default_company)
            companies_query = [default_company]

        found_user = None
        found_company = None
        
        for c in companies_query:
            try:
                c_engine = get_engine_for_db(c.db_name)
                c_session = Session(c_engine)
                u = c_session.query(User).filter(User.username == payload.username).first()
                if u and verify_password(payload.password, u.password_hash):
                    found_user = u
                    found_company = c
                    c_session.close()
                    break
                c_session.close()
            except Exception:
                pass

        if not found_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        user_id = found_user.user_id
        full_name = found_user.full_name
        role = found_user.role
        is_active = found_user.is_active
        companies = [found_company]  # Local branch users can only access their specific clinic branch!

    if not is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    company_list = [
        CompanySimple(
            company_id=c.company_id,
            company_code=c.company_code,
            company_name=c.company_name,
            db_name=c.db_name,
            current_fy=c.current_fy
        )
        for c in companies
    ]

    # Generate temporary discovery ticket
    temp_token = create_access_token({"sub": str(user_id), "role": role, "discovery": True, "full_name": full_name})

    return LoginDiscoveryResponse(
        temp_token=temp_token,
        full_name=full_name,
        role=role,
        user_id=user_id,
        companies=company_list
    )


@router.post("/select-company", response_model=TokenResponse)
def select_company(payload: SelectCompanyRequest, master_db: Session = Depends(get_master_db)):
    """Step 2: Select a company, verify RBAC module access, and issue final active JWT token."""
    # Decode temp token to get user info
    try:
        temp_payload = jwt.decode(payload.temp_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(temp_payload["sub"])
        role = temp_payload["role"]
        full_name = temp_payload.get("full_name", payload.username)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired discovery ticket")

    company = master_db.query(CompanyProfile).filter(CompanyProfile.company_id == payload.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")

    # Query explicit module permissions for this user and company
    module_access = master_db.query(UserModuleAccess).filter(
        UserModuleAccess.user_id == user_id,
        UserModuleAccess.company_id == company.company_id,
        UserModuleAccess.can_view == True
    ).all()

    modules = [m.module_code for m in module_access]

    # If no explicit module access is configured yet or user is Admin/Legacy, grant default full access
    if not modules or role == "Admin" or role == "admin":
        modules = ["Clinic", "Masters", "Billing", "Pharmacy", "Inventory", "Reports", "Users"]

    # Update last login for legacy user in their specific company DB
    try:
        c_engine = get_engine_for_db(company.db_name)
        c_session = Session(c_engine)
        u = c_session.query(User).filter(User.user_id == user_id).first()
        if u:
            u.last_login = datetime.utcnow()
            c_session.commit()
        c_session.close()
    except Exception:
        pass

    # Create final active JWT
    token_payload = {
        "sub": str(user_id),
        "role": role,
        "company_id": company.company_id,
        "company_name": company.company_name,
        "db_name": company.db_name,
        "current_fy": company.current_fy,
        "modules": modules
    }
    token = create_access_token(token_payload)

    return TokenResponse(
        access_token=token,
        role=role,
        full_name=full_name,
        user_id=user_id,
        company_id=company.company_id,
        company_name=company.company_name,
        db_name=company.db_name,
        current_fy=company.current_fy,
        modules=modules
    )


@router.get("/me", response_model=UserOut)
def get_me(
    user_payload: dict = Depends(get_current_user)
):
    """Get current logged-in user info from token payload."""
    user_id = int(user_payload["sub"])
    db_name = user_payload.get("db_name", DB_NAME)
    
    try:
        c_engine = get_engine_for_db(db_name)
        c_session = Session(c_engine)
        user = c_session.query(User).filter(User.user_id == user_id).first()
        if user:
            u_out = UserOut.from_orm(user)
            c_session.close()
            return u_out
        c_session.close()
    except Exception:
        pass

    # Return mock UserOut for MasterUser
    return UserOut(
        user_id=user_id,
        username=user_payload.get("full_name", "admin"),
        full_name=user_payload.get("full_name", "Admin User"),
        role=user_payload.get("role", "Admin"),
        is_active=True
    )
