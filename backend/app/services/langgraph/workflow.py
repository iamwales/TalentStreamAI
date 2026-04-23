"""Complete LangGraph workflow for TalentStreamAI with document generation."""

import os
from typing import Any
from typing import Optional

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from app.tools.ats_scorer import ats_score_resume
from app.tools.job_fetcher import fetch_job_description
from app.tools.resume_parser import parse_resume
from app.core.config import settings


class TalentStreamState(BaseModel):
    """State for the complete TalentStreamAI workflow."""

    job_url: Optional[str] = None
    resume_file: Optional[str] = None
    resume_ext: Optional[str] = None
    job_data: Optional[dict] = None
    resume_data: Optional[dict] = None
    ats_score: Optional[dict] = None
    gap_analysis: Optional[dict] = None
    tailored_resume: Optional[str] = None
    cover_letter: Optional[str] = None
    email_draft: Optional[str] = None
    error: Optional[str] = None


def _get_llm():
    """Get LLM client (uses OpenAI)."""
    api_key = settings.openai_api_key or os.environ.get("OPENAI_API_KEY")
    if api_key:
        return ChatOpenAI(model="gpt-4o", api_key=api_key)
    raise ValueError("No LLM API key configured (OPENAI_API_KEY)")


def _generate_tailored_resume(state: TalentStreamState) -> TalentStreamState:
    """Generate ATS-optimized tailored resume."""
    job_data = state.job_data
    resume_data = state.resume_data
    gap_analysis = state.gap_analysis

    if not job_data or not resume_data:
        return TalentStreamState(error="Missing required data for resume generation")

    gaps = gap_analysis or {}
    keyword_gaps = gaps.get("keyword_gaps", [])
    skill_gaps = gaps.get("skill_gaps", [])

    prompt = f"""Generate an ATS-optimized tailored resume for this position.

JOB DETAILS:
Title: {job_data.get("title", "N/A")}
Company: {job_data.get("company", "N/A")}
Requirements: {job_data.get("requirements", "N/A")}
Responsibilities: {job_data.get("responsibilities", "N/A")}

RESUME DATA:
Contact: {resume_data.get("contact_info", {})}
Summary: {resume_data.get("summary", "N/A")}
Experience: {resume_data.get("experience", [])}
Education: {resume_data.get("education", [])}
Skills: {resume_data.get("skills", [])}

ATS GAPS TO ADDRESS:
{keyword_gaps}
{skill_gaps}

Generate a complete tailored resume in markdown format that:
1. Mirrors the job description's vocabulary and key phrases
2. Highlights matching skills and experiences prominently
3. Addresses the identified gaps where possible
4. Uses ATS-friendly formatting (plain text, no tables or graphics)
5. Is maximum 2 pages in length

Return ONLY the tailored resume content."""

    try:
        llm = _get_llm()
        response = llm.invoke([HumanMessage(content=prompt)])
        return TalentStreamState(
            tailored_resume=response.content,
            job_url=state.job_url,
            resume_file=state.resume_file,
            resume_ext=state.resume_ext,
            job_data=state.job_data,
            resume_data=state.resume_data,
            ats_score=state.ats_score,
            gap_analysis=state.gap_analysis,
        )
    except Exception as e:
        return TalentStreamState(error=f"Failed to generate resume: {str(e)}")


def _generate_cover_letter(state: TalentStreamState) -> TalentStreamState:
    """Generate narrative-driven cover letter."""
    job_data = state.job_data
    resume_data = state.resume_data
    ats_score = state.ats_score

    if not job_data or not resume_data:
        return TalentStreamState(
            error="Missing required data for cover letter generation"
        )

    contact = resume_data.get("contact_info", {})
    name = contact.get("name", "Candidate")
    email = contact.get("email", "")

    prompt = f"""Write a compelling cover letter for this position.

COMPANY: {job_data.get("company", "the company")}
POSITION: {job_data.get("title", "the position")}
LOCATION: {job_data.get("location", "N/A")}
RESPONSIBILITIES: {job_data.get("responsibilities", "N/A")}
QUALIFICATIONS: {job_data.get("requirements", "N/A")}

CANDIDATE INFO:
Name: {name}
Email: {email}
Summary: {resume_data.get("summary", "")}
Experience: {resume_data.get("experience", [])}
Education: {resume_data.get("education", [])}
Skills: {resume_data.get("skills", [])}

ATS SCORE: {ats_score.get("overall_score", 0) if ats_score else "N/A"}%

Write a professional cover letter that:
1. Opens with a compelling hook referencing the company's mission or recent achievements
2. Connects the candidate's experience directly to the job requirements
3. Uses narrative format (storytelling) rather than bullet lists
4. Addresses gaps in qualifications if any (pivot skills, eagerness to learn)
5. Ends with a clear call to action
6. Is 300-400 words
7. Feels genuine and human-written, NOT AI-generated

Use proper cover letter format with date, company address block, and signature.
Return ONLY the cover letter content."""

    try:
        llm = _get_llm()
        response = llm.invoke([HumanMessage(content=prompt)])
        return TalentStreamState(
            cover_letter=response.content,
            job_url=state.job_url,
            resume_file=state.resume_file,
            resume_ext=state.resume_ext,
            job_data=state.job_data,
            resume_data=state.resume_data,
            ats_score=state.ats_score,
            gap_analysis=state.gap_analysis,
            tailored_resume=state.tailored_resume,
        )
    except Exception as e:
        return TalentStreamState(error=f"Failed to generate cover letter: {str(e)}")


def _generate_email_draft(state: TalentStreamState) -> TalentStreamState:
    """Generate ready-to-send Gmail draft."""
    job_data = state.job_data
    resume_data = state.resume_data
    cover_letter = state.cover_letter

    if not job_data or not resume_data:
        return TalentStreamState(error="Missing required data for email generation")

    contact = resume_data.get("contact_info", {})
    name = contact.get("name", "Candidate")
    email = contact.get("email", "")

    prompt = f"""Generate a ready-to-send email draft for a job application.

TARGET COMPANY: {job_data.get("company", "the company")}
TARGET POSITION: {job_data.get("title", "the position")}
JOB URL: {job_data.get("url", "N/A")}

CANDIDATE INFO:
Name: {name}
Email: {email}

COVER LETTER SUMMARY (if available):
{cover_letter[:500] if cover_letter else "See attached cover letter."}

Generate a concise, professional email that:
1. Has a compelling subject line (includes position title and candidate's unique angle)
2. Opens with personalized hook (why THIS company?)
3. Summarizes key qualifications in 2-3 sentences
4. References attached resume and cover letter
5. Is under 150 words (recruiter scanning email in 6 seconds)
6. Has professional sign-off

Return in this format:
Subject: [subject line]
To: [recipient email - use placeholder if unknown]
Body: [email content]
Signature: [candidate name and contact info]"""

    try:
        llm = _get_llm()
        response = llm.invoke([HumanMessage(content=prompt)])
        return TalentStreamState(
            email_draft=response.content,
            job_url=state.job_url,
            resume_file=state.resume_file,
            resume_ext=state.resume_ext,
            job_data=state.job_data,
            resume_data=state.resume_data,
            ats_score=state.ats_score,
            gap_analysis=state.gap_analysis,
            tailored_resume=state.tailored_resume,
            cover_letter=state.cover_letter,
        )
    except Exception as e:
        return TalentStreamState(error=f"Failed to generate email: {str(e)}")


def build_talentstream_workflow() -> StateGraph:
    """Build the complete TalentStreamAI LangGraph workflow."""

    graph = StateGraph(TalentStreamState)

    graph.add_node("fetch_job", _fetch_job_node)
    graph.add_node("parse_resume", _parse_resume_node)
    graph.add_node("score_ats", _score_ats_node)
    graph.add_node("analyze_gaps", _analyze_gaps_node)
    graph.add_node("generate_resume", _generate_tailored_resume)
    graph.add_node("generate_cover_letter", _generate_cover_letter)
    graph.add_node("generate_email", _generate_email_draft)

    graph.set_entry_point("fetch_job")
    graph.add_edge("fetch_job", "parse_resume")
    graph.add_edge("parse_resume", "score_ats")
    graph.add_edge("score_ats", "analyze_gaps")
    graph.add_edge("analyze_gaps", "generate_resume")
    graph.add_edge("generate_resume", "generate_cover_letter")
    graph.add_edge("generate_cover_letter", "generate_email")
    graph.add_edge("generate_email", END)

    return graph.compile()


def _fetch_job_node(state: TalentStreamState) -> TalentStreamState:
    url = state.job_url
    if not url:
        return TalentStreamState(error="No job URL provided")

    try:
        result = fetch_job_description.invoke({"url": url})
        return TalentStreamState(
            job_data=result,
            job_url=state.job_url,
            resume_file=state.resume_file,
            resume_ext=state.resume_ext,
        )
    except Exception as e:
        return TalentStreamState(error=f"Failed to fetch job: {str(e)}")


def _parse_resume_node(state: TalentStreamState) -> TalentStreamState:
    file_content = state.resume_file
    file_ext = state.resume_ext

    if not file_content or not file_ext:
        return TalentStreamState(error="No resume file provided")

    try:
        result = parse_resume.invoke(
            {
                "file_content": file_content,
                "file_extension": file_ext,
            }
        )
        return TalentStreamState(
            resume_data=result,
            job_url=state.job_url,
            resume_file=state.resume_file,
            resume_ext=state.resume_ext,
            job_data=state.job_data,
        )
    except Exception as e:
        return TalentStreamState(error=f"Failed to parse resume: {str(e)}")


def _score_ats_node(state: TalentStreamState) -> TalentStreamState:
    job_data = state.job_data
    resume_data = state.resume_data

    if not job_data or not resume_data:
        return TalentStreamState(error="Missing job or resume data")

    try:
        result = ats_score_resume.invoke(
            {
                "resume_data": resume_data,
                "job_data": job_data,
            }
        )
        return TalentStreamState(
            ats_score=result,
            job_url=state.job_url,
            resume_file=state.resume_file,
            resume_ext=state.resume_ext,
            job_data=state.job_data,
            resume_data=state.resume_data,
        )
    except Exception as e:
        return TalentStreamState(error=f"Failed to score ATS: {str(e)}")


def _analyze_gaps_node(state: TalentStreamState) -> TalentStreamState:
    ats_score = state.ats_score or {}
    resume_data = state.resume_data or {}

    gap_analysis = {
        "keyword_gaps": ats_score.get("keyword_gaps", []),
        "skill_gaps": ats_score.get("skill_gaps", []),
        "experience_gap": ats_score.get("experience", {}),
        "education_gap": ats_score.get("education", {}),
        "recommendations": ats_score.get("recommendations", []),
        "resume_skills": resume_data.get("skills", []),
        "resume_experience": resume_data.get("experience", []),
    }

    return TalentStreamState(
        gap_analysis=gap_analysis,
        job_url=state.job_url,
        resume_file=state.resume_file,
        resume_ext=state.resume_ext,
        job_data=state.job_data,
        resume_data=state.resume_data,
        ats_score=state.ats_score,
    )


async def run_talentstream_workflow(
    job_url: str,
    resume_file: str,
    resume_ext: str,
) -> dict[str, Any]:
    """Run the complete TalentStreamAI workflow."""

    graph = build_talentstream_workflow()

    initial_state = TalentStreamState(
        job_url=job_url,
        resume_file=resume_file,
        resume_ext=resume_ext,
    )

    result = await graph.ainvoke(initial_state)
    return dict(result)


workflow = build_talentstream_workflow()
