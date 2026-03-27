"""
Generate 1000 synthetic IT support tickets for the NASSCOM Helpdesk AI demo.
Run: python generate_data.py
"""
import csv
import random
import uuid
from datetime import datetime, timedelta

random.seed(42)

CATEGORIES = ["Infrastructure", "Application", "Security", "Database", "Network", "Access Management"]
PRIORITIES = ["High", "Medium", "Low"]
STATUSES = ["resolved", "open", "in_progress"]

TEMPLATES = {
    "Infrastructure": [
        ("Server down in production", "Production server {server} is completely unresponsive. Multiple services affected. CPU usage was at {pct}% before crash. Need immediate restore.", "High"),
        ("VM not starting after maintenance", "Virtual machine {vm} fails to boot after scheduled maintenance window. Error: kernel panic at boot.", "Medium"),
        ("Storage array showing errors", "NAS storage unit reporting RAID degradation. Drive {drv} showing I/O errors. Backup jobs are failing.", "High"),
        ("Backup job failed overnight", "Scheduled backup for {server} failed at {time}. Backup logs show timeout after {min} minutes. Data not protected.", "Medium"),
        ("Data center cooling alert", "Cooling system in DC-{dc} reporting high temperature warning. Room temp at {tmp}°C. Need HVAC check.", "High"),
        ("UPS battery low warning", "UPS unit in rack {rack} reporting battery at {pct}% charge. Risk of power loss during outage.", "Medium"),
        ("Hardware failure on blade server", "Blade server {blade} in chassis {chassis} reporting memory ECC errors. Server is unstable.", "High"),
        ("Disk space running low on server", "File server {srv} disk usage at {pct}%. Approaching capacity. Archive or expand needed.", "Low"),
        ("Physical server needs RAM upgrade", "Server {server} experiencing frequent swap usage. Currently 16GB, need upgrade to 64GB for workload.", "Low"),
        ("Server reboot required after patch", "Patch KB{patch} applied to {server}. Server requires reboot to complete patching. Schedule downtime needed.", "Low"),
    ],
    "Application": [
        ("Application crash on login", "Users cannot log into {app}. Application crashes immediately after entering credentials. Error: NullPointerException.", "High"),
        ("Slow performance in ERP module", "ERP system {mod} module responding slowly. Average response time {sec} seconds vs normal 0.5s.", "Medium"),
        ("Report generation failing", "Monthly {rep} report fails to generate. Process hangs at {pct}% and times out after 30 minutes.", "Medium"),
        ("API integration broken", "Integration between {app1} and {app2} API stopped working. 401 Unauthorized errors since {date}.", "High"),
        ("Mobile app crashing on iOS", "Company mobile app crashes on iOS {ver} devices after latest update. Android users unaffected.", "Medium"),
        ("Email notifications not sending", "Automated email notifications from {app} system stopped working. SMTP errors in logs since yesterday.", "Medium"),
        ("User data not syncing", "Data changes in {app} not reflecting in {app2}. Sync job shows success but data mismatch persists.", "High"),
        ("Application license expired", "License for {app} expired on {date}. Users getting license error. Need renewal or temp key.", "High"),
        ("Workflow stuck in pending state", "Purchase approval workflow in {app} stuck for {n} requests. Approver receives no notifications.", "Medium"),
        ("CSV import failing", "Data import tool fails when processing CSV files larger than {mb}MB. Memory exception in logs.", "Low"),
    ],
    "Security": [
        ("Suspected phishing email received", "User received suspicious email claiming to be from IT department asking for password reset. Possible phishing attack.", "High"),
        ("Ransomware alert on endpoint", "Antivirus detected ransomware attempt on workstation {ws}. Files in Documents folder encrypted. Machine isolated.", "High"),
        ("Unauthorized access attempt", "Multiple failed login attempts ({n} in {time} mins) on user account {user} detected. Account locked.", "High"),
        ("SSL certificate expiring soon", "SSL certificate for {domain} expires in {days} days. Renewal required to prevent browser warnings.", "Medium"),
        ("Firewall rule review needed", "Quarterly firewall audit found {n} outdated rules allowing unnecessary inbound traffic on ports {ports}.", "Medium"),
        ("Data breach notification received", "Third-party vendor {vendor} notified of data breach potentially affecting {n} user records.", "High"),
        ("VPN security patch needed", "Critical security patch CVE-{cve} available for VPN gateway. Exploitation in wild reported.", "High"),
        ("USB drive policy violation", "Inventory system flagged user {user} using unauthorized USB drive on secured workstation.", "Medium"),
        ("Antivirus definitions outdated", "Symantec AV definitions on {n} endpoints are {days} days out of date. Update push needed.", "Low"),
        ("Password policy compliance issue", "Audit found {n} user accounts not compliant with new password policy. Force reset required.", "Low"),
    ],
    "Database": [
        ("Database connection pool exhausted", "Production DB {db} connection pool maxed out at {n} connections. New requests queuing. Service degradation.", "High"),
        ("Query performance degradation", "Critical report query in {db} taking {min} minutes vs previous {sec} seconds. Missing index suspected.", "High"),
        ("Replication lag detected", "Database replication lag on {db} slave is {sec} seconds behind master. Risk of stale reads.", "Medium"),
        ("Corrupted data in customer table", "{n} records in customer table show NULL values in mandatory fields after last migration.", "High"),
        ("Database backup failed", "Nightly backup of {db} database failed. Backup logs show insufficient disk space on backup server.", "Medium"),
        ("Table lock causing deadlock", "Deadlock detected in {db} on table {tbl}. {n} transactions rolled back. Application throwing errors.", "High"),
        ("Storage auto-growth disabled", "Database {db} log file at {pct}% capacity with auto-growth disabled. Manual expansion needed.", "Medium"),
        ("Failed migration rollback needed", "Schema migration v{ver} on {db} failed halfway. Partial changes applied. Need clean rollback.", "High"),
        ("Database user permissions mismatch", "Application service account {svc} missing SELECT permission on new {tbl} table after migration.", "Medium"),
        ("Statistics need updating", "Query optimizer choosing wrong execution plan on {db}. Updating statistics should resolve performance issue.", "Low"),
    ],
    "Network": [
        ("VPN users cannot connect", "All remote VPN users unable to connect since {time}. Error: IKE authentication failed. Office WFH impacted.", "High"),
        ("Intermittent network drops", "Users in floor {floor} of building {bldg} experiencing random network disconnects every {min} minutes.", "Medium"),
        ("Network switch port misconfigured", "Switch port on rack {rack} misconfigured as trunk. VLAN {vlan} traffic bleeding. Isolate affected systems.", "Medium"),
        ("DNS resolution failing", "DNS unable to resolve internal hostnames. Issue started after changes to DNS server {dns}. Services affected.", "High"),
        ("Bandwidth saturation on WAN link", "WAN link to branch {branch} saturated at {pct}% capacity during business hours. Conference calls dropping.", "High"),
        ("Wi-Fi dead zone in conference room", "Conference room {room} has no Wi-Fi coverage. AP-{ap} appears offline. Meeting disruptions daily.", "Low"),
        ("Proxy filter blocking legitimate site", "Corporate proxy blocking access to {site} needed for project. Business justification submitted.", "Low"),
        ("BGP route flapping detected", "BGP route flapping detected on ISP link {isp}. Packet loss {pct}% affecting cloud connectivity.", "High"),
        ("DHCP scope exhausted", "DHCP scope for VLAN {vlan} exhausted. New devices cannot obtain IP address. BYOD area affected.", "Medium"),
        ("Load balancer health check failing", "Load balancer {lb} marking backend server {srv} as unhealthy. Traffic not distributed evenly.", "High"),
    ],
    "Access Management": [
        ("New employee account setup needed", "New hire {emp} starting {date} needs AD account, email, VPN, and application access per role {role}.", "Medium"),
        ("Cannot access shared drive after role change", "User {user} moved to {dept} department but still has access to previous department shared drives.", "Medium"),
        ("MFA not working for remote access", "User {user} unable to complete MFA challenge. Authentication app showing wrong codes. Locked out of VPN.", "High"),
        ("Privileged access request for DBA", "DBA team member {user} needs temporary elevated DB access for weekend maintenance window.", "Medium"),
        ("Terminated employee access not revoked", "Former employee {emp} account still active {days} days after termination date {date}. Security risk.", "High"),
        ("Password reset request", "User {user} locked out of account after {n} failed attempts. Needs password reset with identity verification.", "Low"),
        ("Access review overdue", "Semi-annual access review for {dept} department overdue by {days} days. Compliance audit approaching.", "Medium"),
        ("Service account password expiry", "Service account {svc} password expires in {days} days. Multiple application integrations will break.", "High"),
        ("SSO not working for Office 365", "Single Sign-On to Office 365 failing for users in {ou} OU. SAML assertion error in logs.", "High"),
        ("Guest user access request", "External partner from {company} needs guest access to SharePoint project site for bid preparation.", "Low"),
    ],
}

RESOLUTIONS = {
    "Infrastructure": [
        "Performed emergency restart of server services. Identified root cause as memory leak in application daemon. Applied workaround by scheduling daily restart until patch available.",
        "Restored VM from last known good snapshot. Identified BIOS misconfiguration during maintenance. Updated boot settings and verified full functionality.",
        "Replaced failed drive with hot spare. Initiated RAID rebuild process. ETA for rebuild completion: 4 hours. Monitoring rebuild progress.",
        "Investigated backup failure root cause: network timeout. Extended backup timeout parameter and re-ran backup job successfully. Added monitoring alert.",
        "Escalated to data center team. HVAC unit serviced and repaired. Temperature normalized within safe operating range. No hardware damage detected.",
        "Replaced faulty UPS battery module. Performed load test to confirm 2-hour backup capacity. Scheduled regular quarterly battery health checks.",
        "Ran memory diagnostics confirming faulty DIMM. Scheduled maintenance window. Replaced failed memory module. Server stable with no further ECC errors.",
        "Archived old log files and temporary data. Freed 320GB. Sent capacity report to management for storage expansion planning.",
        "Submitted hardware upgrade request to procurement. Approved expedited delivery. Memory expansion scheduled for next maintenance window.",
        "Scheduled reboot during off-peak hours at 11 PM. Coordinated with business stakeholders. Reboot completed successfully in 8 minutes.",
    ],
    "Application": [
        "Identified null session cookie causing crash. Applied hotfix patch v2.3.1. Deployed to production after UAT. All users successfully logging in.",
        "Found missing database index on frequently queried column. Created index in low-traffic window. Response time reduced from 8s to 0.4s.",
        "Increased report generation timeout from 30 to 120 minutes. Optimized underlying SQL query. Report now generating in 22 minutes.",
        "API token expired and not auto-refreshed. Updated integration configuration with new token and implemented auto-refresh mechanism. Integration restored.",
        "Identified crash caused by deprecated API call in iOS 17. Submitted emergency fix. Temporary rollback to previous version available for affected users.",
        "SMTP server certificate expired. Renewed certificate and restarted mail relay service. Email notifications resumed. Added certificate expiry monitoring.",
        "Identified sync conflict resolution bug. Applied patch from vendor. Re-triggered full sync. Data consistent across both systems.",
        "Contacted vendor support. Received 90-day emergency license extension. Submitted formal renewal order through procurement. Users back to normal.",
        "Found approver notification email rule misconfigured after mail server migration. Updated notification templates. All pending approvals re-triggered.",
        "Identified memory constraint in import service. Updated JVM heap size from 512MB to 2GB. CSV imports up to 500MB now working correctly.",
    ],
    "Security": [
        "Confirmed phishing attempt. Blocked sender domain at mail gateway. Collected and deleted all instances of email from mailboxes. Sent awareness advisory to all staff.",
        "Contained incident: isolated machine from network. Engaged IR team. Restored from clean backup. Deployed enhanced endpoint protection. Root cause: malicious email attachment.",
        "Account locked per security policy after threshold reached. Verified user identity via secondary channel. Unlocked and reset credentials. Geo-block rule applied.",
        "Renewed SSL certificate via DigiCert. Deployed to all web servers and load balancers. Certificate monitoring automated for 60-day renewal alerts.",
        "Removed 12 outdated firewall rules after business validation. Applied least-privilege ruleset. Documented changes in change management system.",
        "Initiated vendor breach response protocol. Identified affected accounts. Forced password resets. Enabled enhanced monitoring for affected user subset.",
        "Applied VPN gateway security patch in emergency maintenance window. Verified patch integrity via vendor hash. Restarted services. No exploitation detected.",
        "User counseled on acceptable use policy. USB drive contents scanned and cleared. Blocked USB storage class on endpoint via group policy.",
        "Pushed emergency AV definition update via SCCM. Confirmed update on all endpoints within 2 hours. Scheduled automatic daily definition updates.",
        "Generated list of non-compliant accounts. Sent notifications. Enforced immediate password change via Group Policy. Compliance now at 100%.",
    ],
    "Database": [
        "Identified connection leak in application code. Applied hotfix to properly close connections. Increased connection pool size temporarily. Normal operations resumed.",
        "Identified missing composite index on (customer_id, order_date) columns. Created index during off-hours. Query time reduced from 8 minutes to 3 seconds.",
        "Found replication lag caused by large transaction on master. Optimized transaction to use batch processing. Replica caught up within 15 minutes.",
        "Data corruption traced to failed migration script with incorrect NULL handling. Restored affected records from pre-migration backup. Validated data integrity.",
        "Manual backup triggered after expanding backup storage by 500GB. Verified backup integrity. Automated daily backups re-enabled with increased storage threshold.",
        "Identified deadlock pattern in application transaction order. Worked with dev team to reorder table access in transactions. Deadlocks eliminated.",
        "Expanded log file by 50GB and re-enabled auto-growth with 20% increment. Added disk space alert at 80% threshold. Resolved without service impact.",
        "Executed rollback script to undo partial migration changes. Verified database consistency. Fixed migration script for next attempt. Scheduled retry for weekend.",
        "Granted required SELECT permissions to service account on new tables. Updated application configuration. Tested full application workflow successfully.",
        "Updated statistics on all tables in affected database. Cached query plans cleared. Execution plan now optimal. Query performance restored to baseline.",
    ],
    "Network": [
        "Identified expired IKE certificate on VPN concentrator. Renewed certificate and restarted IKE service. All VPN users reconnecting successfully. Total downtime: 45 minutes.",
        "Identified faulty AP causing interference on floor. Replaced AP hardware. Adjusted nearby AP power levels. Network drops resolved. Users confirmed stable connection.",
        "Corrected switch port VLAN configuration. Changed from trunk to access mode on VLAN 10. Verified no more VLAN bleeding. Documented correct configuration.",
        "Found circular DNS entry created during server migration. Removed circular reference. Flushed DNS cache on all servers. Internal name resolution restored.",
        "Identified backup data replication saturating WAN link during business hours. Rescheduled backup replication to 10 PM - 4 AM window. Daytime bandwidth freed.",
        "Replaced offline AP with spare unit. Configured with matching SSID and security settings. Signal strength confirmed in conference room. Users connecting successfully.",
        "Added business exception rule for required site in proxy. Applied department-specific allow list. Users can now access required resource. Exception documented.",
        "Coordinated with ISP to address BGP route instability. ISP applied route dampening and fixed misconfigured peer. Route stabilized. Packet loss back to 0%.",
        "Expanded DHCP scope by adding new IP range. Devices now obtaining addresses. Implemented DHCP monitoring to alert at 80% scope utilization.",
        "Resolved health check failure caused by SSL certificate mismatch. Updated load balancer SSL profile. Backend server passing health checks. Traffic balanced correctly.",
    ],
    "Access Management": [
        "Created AD user account, mail-enabled, added to distribution groups per role template. Provided access to required applications. New hire onboarding checklist completed.",
        "Revoked access to previous department shares per role change procedure. Granted access to new department resources. Updated access matrix documentation.",
        "Re-enrolled user in MFA system with new authenticator app. Verified access with test authentication. Provided backup codes. Checked and corrected time sync on user device.",
        "Granted time-limited privileged access via PAM system. Access auto-expires after maintenance window. All privileged actions logged. Access revoked on schedule.",
        "Immediately disabled former employee AD account, revoked all application licenses, invalidated VPN certificates. Conducted access audit. No unauthorized access detected.",
        "Verified user identity via manager confirmation and security questions. Reset password and unlocked account. Notified user via alternate contact method.",
        "Completed access review for department. Removed 23 excessive permissions across 8 users. Updated access documentation. Submitted compliance report.",
        "Rotated service account password before expiry. Updated password in all integrated applications and vaults. Tested all dependent services. No disruption caused.",
        "Found SAML attribute mapping broken after directory OU rename. Updated SP configuration with correct OU path. SSO tested and confirmed working for all users.",
        "Created guest account with time-limited access (30 days). Restricted to specific SharePoint site. Sent invite to external partner. Access documented in ITSM.",
    ],
}

PLACEHOLDER_FUNCS = {
    "server": lambda: f"SRV-{random.randint(1,99):02d}",
    "pct": lambda: str(random.randint(75, 99)),
    "vm": lambda: f"VM-{random.randint(100,999)}",
    "drv": lambda: f"Drive-{random.choice(['A','B','C','D'])}",
    "time": lambda: f"{random.randint(0,23):02d}:{random.randint(0,59):02d}",
    "min": lambda: str(random.randint(10, 120)),
    "dc": lambda: str(random.randint(1, 4)),
    "tmp": lambda: str(random.randint(28, 38)),
    "rack": lambda: f"R{random.randint(1,20):02d}",
    "blade": lambda: f"BLD-{random.randint(1,16)}",
    "chassis": lambda: f"CH-{random.randint(1,8)}",
    "srv": lambda: f"SVR-{random.randint(1,50):02d}",
    "patch": lambda: str(random.randint(10000000, 99999999)),
    "app": lambda: random.choice(["Salesforce", "SAP ERP", "Jira", "Confluence", "ServiceNow", "Oracle EBS", "Workday"]),
    "app1": lambda: random.choice(["Salesforce", "SAP", "Oracle"]),
    "app2": lambda: random.choice(["Jira", "Workday", "ServiceNow"]),
    "mod": lambda: random.choice(["Finance", "HR", "Procurement", "Inventory", "CRM"]),
    "sec": lambda: str(random.randint(2, 30)),
    "rep": lambda: random.choice(["Sales", "Financial", "Compliance", "Audit", "Operations"]),
    "date": lambda: f"{random.randint(2024,2025)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
    "ver": lambda: f"{random.randint(14,17)}.{random.randint(0,3)}",
    "n": lambda: str(random.randint(2, 500)),
    "mb": lambda: str(random.randint(5, 50)),
    "ws": lambda: f"WS-{random.randint(1000,9999)}",
    "user": lambda: random.choice(["john.smith", "jane.doe", "bob.wilson", "alice.chen", "raj.kumar", "maria.garcia"]),
    "domain": lambda: random.choice(["portal.company.com", "api.company.com", "app.company.com", "mail.company.com"]),
    "days": lambda: str(random.randint(1, 90)),
    "ports": lambda: f"{random.randint(1024,65535)}, {random.randint(1024,65535)}",
    "vendor": lambda: random.choice(["Salesforce", "AWS", "Microsoft", "CloudHR", "BizAnalytics"]),
    "cve": lambda: f"{random.randint(2023,2024)}-{random.randint(10000,99999)}",
    "db": lambda: random.choice(["PRODDB01", "HRDB", "FINDB", "ANALYTICSDB", "CRMDB"]),
    "tbl": lambda: random.choice(["customers", "orders", "transactions", "employees", "invoices"]),
    "floor": lambda: str(random.randint(1, 10)),
    "bldg": lambda: random.choice(["HQ", "Tower-A", "Tower-B", "Annex"]),
    "vlan": lambda: str(random.randint(10, 200)),
    "dns": lambda: f"DNS-{random.randint(1,3)}",
    "branch": lambda: random.choice(["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad"]),
    "room": lambda: f"{random.choice(['A','B','C'])}-{random.randint(100,300)}",
    "ap": lambda: str(random.randint(10, 99)),
    "site": lambda: random.choice(["github.com", "stackoverflow.com", "npmjs.com", "pypi.org", "docs.aws.amazon.com"]),
    "isp": lambda: random.choice(["Airtel", "Jio", "BSNL", "Tata"]),
    "lb": lambda: f"LB-{random.randint(1,4)}",
    "emp": lambda: random.choice(["Arjun Mehta", "Priya Nair", "Karan Shah", "Neha Gupta", "Vikram Rao"]),
    "role": lambda: random.choice(["Software Engineer", "Business Analyst", "HR Manager", "Finance Analyst", "DevOps Engineer"]),
    "dept": lambda: random.choice(["Engineering", "Finance", "HR", "Sales", "Operations"]),
    "ou": lambda: random.choice(["OU=Sales", "OU=Engineering", "OU=Finance", "OU=External"]),
    "svc": lambda: f"svc_{random.choice(['app','db','sync','backup','monitor'])}",
    "company": lambda: random.choice(["TechCorp", "PartnerInc", "VendorLtd", "ConsultancyCo"]),
    "site": lambda: random.choice(["github.com", "stackoverflow.com", "npmjs.com"]),
}


def fill_template(text):
    for key, func in PLACEHOLDER_FUNCS.items():
        placeholder = "{" + key + "}"
        while placeholder in text:
            text = text.replace(placeholder, func(), 1)
    return text


def generate_tickets(n=1000):
    tickets = []
    start_date = datetime(2024, 1, 1)

    for i in range(n):
        cat = random.choice(CATEGORIES)
        idx = random.randint(0, len(TEMPLATES[cat]) - 1)
        title_tmpl, desc_tmpl, default_priority = TEMPLATES[cat][idx]
        res_tmpl = RESOLUTIONS[cat][idx % len(RESOLUTIONS[cat])]

        title = fill_template(title_tmpl)
        desc = fill_template(desc_tmpl)
        resolution = fill_template(res_tmpl)

        # Some variance in priority
        if random.random() < 0.2:
            priority = random.choice(PRIORITIES)
        else:
            priority = default_priority

        # Status distribution: more resolved for demo
        status_rand = random.random()
        if status_rand < 0.65:
            status = "resolved"
        elif status_rand < 0.85:
            status = "in_progress"
        else:
            status = "open"

        created_offset = timedelta(
            days=random.randint(0, 365),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59)
        )
        created_at = start_date + created_offset

        # Resolution time based on priority
        base_hours = {"High": random.randint(1, 8), "Medium": random.randint(4, 24), "Low": random.randint(8, 72)}
        resolved_at = (created_at + timedelta(hours=base_hours[priority])).isoformat() if status == "resolved" else None

        tickets.append({
            "ticket_id": f"TKT-{i+1:04d}",
            "title": title,
            "description": desc,
            "category": cat,
            "priority": priority,
            "status": status,
            "resolution": resolution if status == "resolved" else "",
            "created_at": created_at.isoformat(),
            "resolved_at": resolved_at or "",
            "assigned_agent": random.choice(["Agent_A", "Agent_B", "Agent_C", "Agent_D", "Agent_E"]) if status != "open" else "",
        })

    return tickets


if __name__ == "__main__":
    import os
    os.makedirs("data", exist_ok=True)
    tickets = generate_tickets(1000)
    with open("data/tickets.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=tickets[0].keys())
        writer.writeheader()
        writer.writerows(tickets)
    print(f"✅ Generated {len(tickets)} tickets → data/tickets.csv")
