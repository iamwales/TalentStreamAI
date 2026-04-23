"""API v1 endpoints for TalentStreamAI."""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.services.langgraph import run_talentstream_workflow
from app.tools.job_fetcher import fetch_job_description
from app.tools.resume_parser import parse_resume
from app.tools.ats_scorer import ats_score_resume

router = APIRouter()


def validate_resume_file(resume: UploadFile) -> str:
    """Validate resume file format and return the extension."""
    ext = resume.filename.rsplit(".", 1)[-1].lower() if resume.filename else ""
    if not ext or ext not in ["pdf", "docx", "doc"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Use PDF or DOCX.",
        )
    return ext


class ApplyRequest(BaseModel):
    job_url: str = Field(..., description="URL of the job posting")


class ApplyResponse(BaseModel):
    status: str
    job_data: dict | None = None
    resume_data: dict | None = None
    ats_score: dict | None = None
    gap_analysis: dict | None = None
    tailored_resume: str | None = None
    cover_letter: str | None = None
    email_draft: str | None = None


class FetchJobResponse(BaseModel):
    status: str
    job_data: dict


class ParseResumeResponse(BaseModel):
    status: str
    resume_data: dict


class ScoreATSRequest(BaseModel):
    job_url: str = Field(..., description="URL of the job posting")


class ScoreATSResponse(BaseModel):
    status: str
    ats_score: dict


@router.post("/apply", response_model=ApplyResponse)
async def apply_to_job(
    job_url: str = Form(..., description="URL of the job posting"),
    resume: UploadFile = File(..., description="Resume file (PDF or DOCX)"),
) -> ApplyResponse:
    """Run complete TalentStreamAI workflow to generate application materials."""
    import base64

    ext = validate_resume_file(resume)

    file_content = await resume.read()
    file_b64 = base64.b64encode(file_content).decode("utf-8")

    try:
        result = await run_talentstream_workflow(
            job_url=job_url,
            resume_file=file_b64,
            resume_ext=ext,
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow failed: {str(e)}")

    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])

    return ApplyResponse(
        status="success",
        job_data=result.get("job_data"),
        resume_data=result.get("resume_data"),
        ats_score=result.get("ats_score"),
        gap_analysis=result.get("gap_analysis"),
        tailored_resume=result.get("tailored_resume"),
        cover_letter=result.get("cover_letter"),
        email_draft=result.get("email_draft"),
    )


@router.post("/fetch-job", response_model=FetchJobResponse)
async def fetch_job(job_url: str = Form(...)) -> FetchJobResponse:
    """Fetch and parse a job description from URL."""
    try:
        result = fetch_job_description.invoke({"url": job_url})
        return FetchJobResponse(status="success", job_data=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch job: {str(e)}")


@router.post("/parse-resume", response_model=ParseResumeResponse)
async def parse_resume_endpoint(
    resume: UploadFile = File(...),
) -> ParseResumeResponse:
    """Parse a resume file (PDF or DOCX)."""
    import base64

    ext = validate_resume_file(resume)

    file_content = await resume.read()
    file_b64 = base64.b64encode(file_content).decode("utf-8")

    try:
        result = parse_resume.invoke(
            {
                "file_content": file_b64,
                "file_extension": ext,
            }
        )
        return ParseResumeResponse(status="success", resume_data=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")


@router.post("/score-ats", response_model=ScoreATSResponse)
async def score_ats(
    job_url: str = Form(...),
    resume: UploadFile = File(...),
) -> ScoreATSResponse:
    """Score resume against job description for ATS compatibility."""
    import base64

    ext = validate_resume_file(resume)

    file_content = await resume.read()
    file_b64 = base64.b64encode(file_content).decode("utf-8")

    try:
        job_data = fetch_job_description.invoke({"url": job_url})
        resume_data = parse_resume.invoke(
            {
                "file_content": file_b64,
                "file_extension": ext,
            }
        )
        score = ats_score_resume.invoke(
            {
                "resume_data": resume_data,
                "job_data": job_data,
            }
        )
        return ScoreATSResponse(status="success", ats_score=score)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to score: {str(e)}")
