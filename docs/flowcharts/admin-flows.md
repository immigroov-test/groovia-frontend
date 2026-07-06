# Admin flows

Admin = `yokeshmd99@gmail.com` (auto-assigned the admin role on signup). Two tabs: **Approval** and **Activity**.

## Approval tab — mentors + services
```mermaid
flowchart TD
  A[Approval tab] --> B[Services awaiting approval]
  A --> C[Pending mentor applications]
  B --> D{Review a service}
  D -->|Approve| E[Service live]
  D -->|Reject| F[Service rejected]
  C --> G[View details:<br/>bio, expertise, languages, availability]
  G --> H{Decision}
  H -->|Approve| I[Mentor live<br/>their pending services approved too]
  H -->|Reject| J[Enter a reason<br/>shown to the mentor + emailed]
  A --> K[Active mentors → Suspend]
  A --> L[Suspended mentors → Reinstate]
```

## Activity tab — booking oversight
```mermaid
flowchart TD
  A[Activity tab] --> B[All bookings table<br/>when, mentor, mentee, status]
  B --> C[Filter by status / search mentee]
  B --> D[Click a row]
  D --> E[Timeline:<br/>booked-at, no-show party,<br/>cancel/reschedule requests + offers]
```

## Where the data comes from (trust boundary)
```mermaid
flowchart LR
  Browser[Admin browser] -->|BFF app/api| Next[Next.js server]
  Next -->|Bearer JWT| API[FastAPI require_admin]
  API -->|service-role| DB[(Supabase / Postgres)]
  Browser -. own profile only, RLS .-> DB
```
