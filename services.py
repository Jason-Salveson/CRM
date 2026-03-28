# services.py
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import models

def trigger_stage_automations(db: Session, deal: models.Deal):
    """
    The engine that checks the deal's new stage and generates the MREA task list.
    """
    new_tasks = []
    now = datetime.utcnow()

    # THE AUTOMATION RULES MATRIX
    if deal.stage == "Appointment":
        new_tasks = [
            {"name": "Send Pre-Listing/Buyer Packet", "days_out": 0},
            {"name": "Confirm Appointment time via SMS", "days_out": 1},
            {"name": "Print CMA / Market Comps", "days_out": 1}
        ]
        
    elif deal.stage == "Active":
        if deal.deal_type == "Seller":
            new_tasks = [
                {"name": "Order Photography", "days_out": 0},
                {"name": "Order Sign Installation", "days_out": 0},
                {"name": "Input into MLS", "days_out": 1}
            ]
        elif deal.deal_type == "Buyer":
            new_tasks = [
                {"name": "Set up automated MLS search email", "days_out": 0},
                {"name": "Schedule first property tour", "days_out": 2}
            ]
            
    elif deal.stage == "Under Contract":
         new_tasks = [
            {"name": "Send Executed Contract to Title/Escrow", "days_out": 0},
            {"name": "Introduce Transaction Coordinator via Email", "days_out": 0},
            {"name": "Schedule Inspection", "days_out": 1},
            {"name": "Verify Earnest Money Deposit", "days_out": 3}
        ]

    # EXECUTE THE AUTOMATION
    for task_template in new_tasks:
        task = models.Task(
            user_id=deal.user_id,
            contact_id=deal.contact_id,
            deal_id=deal.deal_id,
            task_name=task_template["name"],
            due_date=now + timedelta(days=task_template["days_out"])
        )
        db.add(task)
    
    # Save all generated tasks to the database simultaneously
    db.commit()