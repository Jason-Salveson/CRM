# services.py
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import models

# 1. Map stages to an index so Python knows which stages are "ahead" or "behind"
STAGE_INDEX = {
    "Lead": 0, 
    "Contact": 1, 
    "Appointment": 2, 
    "Active": 3, 
    "Under Contract": 4, 
    "Closed": 5
}

# 2. Master dictionary of automated tasks
AUTOMATED_TASKS = {
    "Appointment": [
        {"name": "Send Pre-Listing/Buyer Packet", "days_out": 0},
        {"name": "Confirm Appointment time via SMS", "days_out": 1},
        {"name": "Print CMA / Market Comps", "days_out": 1}
    ],
    "Active_Seller": [
        {"name": "Order Photography", "days_out": 0},
        {"name": "Order Sign Installation", "days_out": 0},
        {"name": "Input into MLS", "days_out": 1}
    ],
    "Active_Buyer": [
        {"name": "Set up automated MLS search email", "days_out": 0},
        {"name": "Schedule first property tour", "days_out": 2}
    ],
    "Under Contract": [
        {"name": "Send Executed Contract to Title/Escrow", "days_out": 0},
        {"name": "Introduce Transaction Coordinator via Email", "days_out": 0},
        {"name": "Schedule Inspection", "days_out": 1},
        {"name": "Verify Earnest Money Deposit", "days_out": 3}
    ]
}

def trigger_stage_automations(db: Session, deal: models.Deal):
    """
    The engine that checks the deal's new stage, cleans up irrelevant future tasks 
    if the deal fell through, and generates the new MREA task list.
    """
    now = datetime.utcnow()
    current_stage_idx = STAGE_INDEX.get(deal.stage, 0)

    # ==========================================
    # PHASE 1: PIPELINE REVERSION CLEANUP
    # ==========================================
    # Fetch all incomplete tasks for this specific deal
    incomplete_tasks = db.query(models.Task).filter(
        models.Task.deal_id == deal.deal_id,
        models.Task.is_completed == "False"
    ).all()

    for task in incomplete_tasks:
        task_stage = None
        
        # Figure out which stage this automated task belongs to
        for stage_name, task_list in AUTOMATED_TASKS.items():
            for t in task_list:
                if task.task_name.startswith(t["name"]):
                    # Normalize "Active_Seller" to just "Active" for the index check
                    task_stage = "Active" if "Active" in stage_name else stage_name
                    break
            if task_stage: break
        
        # If it's an automated task AND belongs to a stage AHEAD of where we are now, delete it.
        if task_stage and STAGE_INDEX.get(task_stage, 0) > current_stage_idx:
            db.delete(task)
    
    db.commit()

    # ==========================================
    # PHASE 2: GENERATE NEW TASKS
    # ==========================================
    new_tasks = []
    if deal.stage == "Appointment":
        new_tasks = AUTOMATED_TASKS["Appointment"]
    elif deal.stage == "Active":
        new_tasks = AUTOMATED_TASKS["Active_Seller"] if deal.deal_type == "Seller" else AUTOMATED_TASKS["Active_Buyer"]
    elif deal.stage == "Under Contract":
        new_tasks = AUTOMATED_TASKS["Under Contract"]

    for task_template in new_tasks:
        # CONTEXT FIX: Append the deal name to the task so it's identifiable on the dashboard
        formatted_task_name = f"{task_template['name']} ({deal.deal_name})"
        
        # DUPLICATE FIX: Only create the task if it doesn't already exist and is incomplete
        existing_task = db.query(models.Task).filter(
            models.Task.deal_id == deal.deal_id,
            models.Task.task_name == formatted_task_name,
            models.Task.is_completed == "False"
        ).first()

        if not existing_task:
            task = models.Task(
                user_id=deal.user_id,
                contact_id=deal.contact_id,
                deal_id=deal.deal_id,
                task_name=formatted_task_name,
                due_date=now + timedelta(days=task_template["days_out"])
            )
            db.add(task)
    
    db.commit()