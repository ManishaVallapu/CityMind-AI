"""
End-to-End Verification of the complete Citizen & Admin Flow:
1. Citizen:
   - Login
   - Submit complaint with location, details, category
   - Upload real image attachment
   - Complaint saved in database with SUBMITTED status
2. Admin:
   - Login
   - Open Admin dashboard -> See real complaint statistics
   - Open Complaints ledger -> Find citizen's complaint
   - Open complaint details -> See complete information, citizen info, history, attachments
   - Assign active officer -> Transitions to ASSIGNED
   - Update status to IN_PROGRESS with audit remarks
   - Update status to RESOLVED with audit remarks
   - Update status to CLOSED with audit remarks
3. Citizen:
   - Open complaint details and history
   - See updated CLOSED status, assigned officer, resolution timestamp, and audit trail
"""

import io
import pytest
from httpx import AsyncClient

from app.models.category import ComplaintCategory
from app.models.user import User


@pytest.mark.asyncio
async def test_end_to_end_admin_citizen_lifecycle(
    client: AsyncClient,
    test_citizen_user: User,
    citizen_token: str,
    test_admin_user: User,
    admin_token: str,
    test_officer_user: User,
    test_category: ComplaintCategory,
):
    print("\n--- [STEP 1] Citizen Submits Grievance with Media Attachment ---")
    c_headers = {"Authorization": f"Bearer {citizen_token}"}
    a_headers = {"Authorization": f"Bearer {admin_token}"}

    complaint_payload = {
        "title": "Severe Water Main Rupture flooding arterial road",
        "description": "Potable water pipeline fractured causing road cave-in and property damage.",
        "category_id": test_category.id,
        "latitude": 28.6145,
        "longitude": 77.2102,
        "address": "Ring Road Intersection, Sector 7",
    }
    create_res = await client.post("/api/v1/complaints", json=complaint_payload, headers=c_headers)
    assert create_res.status_code == 201, create_res.text
    complaint_data = create_res.json()
    complaint_id = complaint_data["id"]
    ticket_number = complaint_data["ticket_number"]
    assert complaint_data["status"] == "SUBMITTED"
    print(f"   Created Ticket: {ticket_number} (ID: {complaint_id})")

    # Upload attachment evidence (valid PNG magic bytes)
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
        b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    upload_res = await client.post(
        f"/api/v1/complaints/{complaint_id}/attachments",
        files={"file": ("flooding_evidence.png", io.BytesIO(png_bytes), "image/png")},
        headers=c_headers,
    )
    assert upload_res.status_code == 201, upload_res.text
    attachment_id = upload_res.json()["id"]
    print(f"   Attached Evidence: flooding_evidence.png (ID: {attachment_id})")

    print("\n--- [STEP 2] Admin Inspects Dashboard Live Metrics ---")
    stats_res = await client.get("/api/v1/admin/stats", headers=a_headers)
    assert stats_res.status_code == 200, stats_res.text
    stats = stats_res.json()
    assert stats["total"] >= 1
    assert stats["submitted"] >= 1
    assert stats["officers_count"] >= 1
    print(f"   Real Total Grievances: {stats['total']}, Submitted: {stats['submitted']}, Active Officers: {stats['officers_count']}")

    print("\n--- [STEP 3] Admin Searches and Finds Citizen Grievance in Ledger ---")
    list_res = await client.get(
        "/api/v1/complaints",
        params={"search": ticket_number, "status": "SUBMITTED"},
        headers=a_headers,
    )
    assert list_res.status_code == 200, list_res.text
    ledger = list_res.json()
    assert any(c["id"] == complaint_id for c in ledger["items"])
    print(f"   Found Ticket {ticket_number} via server-side search in ledger.")

    print("\n--- [STEP 4] Admin Opens Complaint Details and Inspects Evidence ---")
    detail_res = await client.get(f"/api/v1/complaints/{complaint_id}", headers=a_headers)
    assert detail_res.status_code == 200, detail_res.text
    detail = detail_res.json()
    assert detail["citizen"] is not None
    assert detail["citizen"]["email"] == test_citizen_user.email
    assert len(detail["attachments"]) >= 1
    print(f"   Verified Citizen: {detail['citizen']['full_name']} ({detail['citizen']['email']})")

    # Verify attachment is downloadable
    att_get_res = await client.get(
        f"/api/v1/complaints/{complaint_id}/attachments/{attachment_id}",
        headers=a_headers,
    )
    assert att_get_res.status_code == 200
    assert att_get_res.headers["content-type"] == "image/png"
    print("   Verified Evidence download endpoint.")

    print("\n--- [STEP 5] Admin Assigns Municipal Officer ---")
    officers_res = await client.get("/api/v1/admin/officers", headers=a_headers)
    assert officers_res.status_code == 200
    officer_roster = officers_res.json()
    assert len(officer_roster) >= 1
    target_officer = officer_roster[0]

    assign_res = await client.patch(
        f"/api/v1/complaints/{complaint_id}/assign",
        json={"officer_id": target_officer["id"]},
        headers=a_headers,
    )
    assert assign_res.status_code == 200, assign_res.text
    assigned_data = assign_res.json()
    assert assigned_data["status"] == "ASSIGNED"
    assert assigned_data["assigned_officer_id"] == target_officer["id"]
    print(f"   Assigned to Officer: {target_officer['badge_number']} ({target_officer['full_name']})")

    print("\n--- [STEP 6] Admin Executes State Transitions According to State Machine ---")
    # Transition to IN_PROGRESS
    t1 = await client.patch(
        f"/api/v1/complaints/{complaint_id}/status",
        json={"status": "IN_PROGRESS", "remarks": "Excavation and pipe replacement team on site"},
        headers=a_headers,
    )
    assert t1.status_code == 200
    assert t1.json()["status"] == "IN_PROGRESS"
    print("   Transitioned -> IN_PROGRESS")

    # Transition to RESOLVED
    t2 = await client.patch(
        f"/api/v1/complaints/{complaint_id}/status",
        json={"status": "RESOLVED", "remarks": "Pipeline welded, pressure tested, and road patched"},
        headers=a_headers,
    )
    assert t2.status_code == 200
    assert t2.json()["status"] == "RESOLVED"
    assert t2.json()["resolved_at"] is not None
    print("   Transitioned -> RESOLVED")

    # Transition to CLOSED
    t3 = await client.patch(
        f"/api/v1/complaints/{complaint_id}/status",
        json={"status": "CLOSED", "remarks": "Final field audit passed, citizen notified"},
        headers=a_headers,
    )
    assert t3.status_code == 200
    assert t3.json()["status"] == "CLOSED"
    assert t3.json()["closed_at"] is not None
    print("   Transitioned -> CLOSED")

    print("\n--- [STEP 7] Citizen Inspects Updated Complaint & Complete Audit Trail ---")
    c_view = await client.get(f"/api/v1/complaints/{complaint_id}", headers=c_headers)
    assert c_view.status_code == 200
    cv = c_view.json()
    assert cv["status"] == "CLOSED"
    assert cv["assigned_officer"] is not None
    assert cv["assigned_officer"]["badge_number"] == target_officer["badge_number"]
    assert len(cv["status_history"]) >= 5
    print(f"   Citizen sees CLOSED status with {len(cv['status_history'])} verified audit history events!")
    print("--- END-TO-END FLOW VERIFICATION COMPLETE AND SUCCESSFUL ---")
