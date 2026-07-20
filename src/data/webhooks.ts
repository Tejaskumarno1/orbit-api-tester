export interface WebhookEventTemplate {
  type: string;
  description: string;
  payload: any;
}

const getBasePayload = (eventType: string, customData: Record<string, any> = {}) => ({
  api_version: "2024-01-01",
  created: new Date().toISOString(),
  id: "evt_" + Math.random().toString(36).substring(2, 15),
  type: eventType,
  data: {
    id: "rec_" + Math.random().toString(36).substring(2, 12),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...customData
  }
});

export const webhookTemplates: WebhookEventTemplate[] = [
  // --- Orbit Ops Webhooks ---
  {
    type: "comment.created",
    description: "Orbit Ops: comment created",
    payload: getBasePayload("comment.created", {
      comment_text: "Reviewed the latest task updates and verified the resolution.",
      author_id: "usr_ops_01",
      task_id: "tsk_8842"
    })
  },
  {
    type: "milestone.completed",
    description: "Orbit Ops: milestone completed",
    payload: getBasePayload("milestone.completed", {
      title: "Sprint 42 Release Milestone",
      project_id: "prj_alpha_99",
      completed_at: new Date().toISOString()
    })
  },
  {
    type: "milestone.created",
    description: "Orbit Ops: milestone created",
    payload: getBasePayload("milestone.created", {
      title: "Q3 System Upgrade Milestone",
      project_id: "prj_alpha_99",
      due_date: new Date(Date.now() + 30 * 86400000).toISOString()
    })
  },
  {
    type: "milestone.deleted",
    description: "Orbit Ops: milestone deleted",
    payload: getBasePayload("milestone.deleted", {
      title: "Legacy Integration Milestone",
      project_id: "prj_alpha_99"
    })
  },
  {
    type: "milestone.updated",
    description: "Orbit Ops: milestone updated",
    payload: getBasePayload("milestone.updated", {
      title: "Q3 System Upgrade Milestone (Revised)",
      project_id: "prj_alpha_99",
      progress: 65
    })
  },
  {
    type: "project.created",
    description: "Orbit Ops: project created",
    payload: getBasePayload("project.created", {
      name: "NextGen Mobile App",
      key: "NMA",
      owner_id: "usr_lead_01",
      status: "active"
    })
  },
  {
    type: "project.deleted",
    description: "Orbit Ops: project deleted",
    payload: getBasePayload("project.deleted", {
      name: "Deprecated Microservice",
      key: "DMS"
    })
  },
  {
    type: "project.updated",
    description: "Orbit Ops: project updated",
    payload: getBasePayload("project.updated", {
      name: "NextGen Mobile App v2",
      key: "NMA",
      status: "in_review"
    })
  },
  {
    type: "task.assigned",
    description: "Orbit Ops: task assigned",
    payload: getBasePayload("task.assigned", {
      task_identifier: "OPS-104",
      title: "Optimize database query performance",
      assigned_to: "usr_dev_42"
    })
  },
  {
    type: "task.created",
    description: "Orbit Ops: task created",
    payload: getBasePayload("task.created", {
      task_identifier: "OPS-105",
      title: "Simulated Webhook Event Task",
      priority_id: "high",
      status_id: "open",
      task_type_id: "bug"
    })
  },
  {
    type: "task.deleted",
    description: "Orbit Ops: task deleted",
    payload: getBasePayload("task.deleted", {
      task_identifier: "OPS-101",
      title: "Obsolete design refactor"
    })
  },
  {
    type: "task.priority_changed",
    description: "Orbit Ops: task priority changed",
    payload: getBasePayload("task.priority_changed", {
      task_identifier: "OPS-105",
      old_priority: "medium",
      new_priority: "urgent"
    })
  },
  {
    type: "task.status_changed",
    description: "Orbit Ops: task status changed",
    payload: getBasePayload("task.status_changed", {
      task_identifier: "OPS-105",
      old_status: "open",
      new_status: "in_progress"
    })
  },
  {
    type: "task.time_logged",
    description: "Orbit Ops: task time logged",
    payload: getBasePayload("task.time_logged", {
      task_identifier: "OPS-105",
      hours_logged: 3.5,
      notes: "Implemented unit tests and load testing suite"
    })
  },
  {
    type: "task.updated",
    description: "Orbit Ops: task updated",
    payload: getBasePayload("task.updated", {
      task_identifier: "OPS-105",
      title: "Updated Task Specifications",
      progress: 75
    })
  },

  // --- Orbit Resolve Webhooks ---
  {
    type: "approval.granted",
    description: "Orbit Resolve: approval granted",
    payload: getBasePayload("approval.granted", {
      change_id: "chg_9012",
      approver_id: "mgr_sec_01",
      notes: "Approved for production deployment."
    })
  },
  {
    type: "approval.rejected",
    description: "Orbit Resolve: approval rejected",
    payload: getBasePayload("approval.rejected", {
      change_id: "chg_9012",
      approver_id: "mgr_sec_01",
      reason: "Missing rollback plan documentation."
    })
  },
  {
    type: "approval.requested",
    description: "Orbit Resolve: approval requested",
    payload: getBasePayload("approval.requested", {
      change_id: "chg_9012",
      requested_by: "dev_ops_03",
      required_role: "security_lead"
    })
  },
  {
    type: "change.created",
    description: "Orbit Resolve: change created (ITIL)",
    payload: getBasePayload("change.created", {
      change_number: "CHG-4091",
      summary: "Database Schema Migration v4.2",
      risk_level: "medium"
    })
  },
  {
    type: "change.status_changed",
    description: "Orbit Resolve: change status changed (ITIL)",
    payload: getBasePayload("change.status_changed", {
      change_number: "CHG-4091",
      old_status: "draft",
      new_status: "pending_approval"
    })
  },
  {
    type: "problem.created",
    description: "Orbit Resolve: problem created (ITIL)",
    payload: getBasePayload("problem.created", {
      problem_number: "PRB-201",
      impact: "high",
      root_cause_summary: "Investigating memory leak in authentication cluster"
    })
  },
  {
    type: "ticket.assigned",
    description: "Orbit Resolve: ticket assigned to an agent",
    payload: getBasePayload("ticket.assigned", {
      ticket_id: "TCK-8821",
      assigned_agent_id: "agent_smith_07"
    })
  },
  {
    type: "ticket.closed",
    description: "Orbit Resolve: ticket closed",
    payload: getBasePayload("ticket.closed", {
      ticket_id: "TCK-8821",
      closed_by: "system_auto_close"
    })
  },
  {
    type: "ticket.created",
    description: "Orbit Resolve: ticket created",
    payload: getBasePayload("ticket.created", {
      ticket_id: "TCK-8821",
      subject: "Unable to reset password via SMS link",
      customer_email: "user@enterprise.com",
      priority: "high"
    })
  },
  {
    type: "ticket.csat_submitted",
    description: "Orbit Resolve: ticket CSAT submitted",
    payload: getBasePayload("ticket.csat_submitted", {
      ticket_id: "TCK-8821",
      rating: 5,
      feedback: "Great support, issue was resolved within minutes!"
    })
  },
  {
    type: "ticket.message_created",
    description: "Orbit Resolve: reply / message added",
    payload: getBasePayload("ticket.message_created", {
      ticket_id: "TCK-8821",
      sender_type: "agent",
      message: "We have deployed a hotfix. Please try resetting your password now."
    })
  },
  {
    type: "ticket.priority_changed",
    description: "Orbit Resolve: ticket priority changed",
    payload: getBasePayload("ticket.priority_changed", {
      ticket_id: "TCK-8821",
      old_priority: "normal",
      new_priority: "urgent"
    })
  },
  {
    type: "ticket.reopened",
    description: "Orbit Resolve: ticket reopened",
    payload: getBasePayload("ticket.reopened", {
      ticket_id: "TCK-8821",
      reopened_reason: "Customer reported issue persists"
    })
  },
  {
    type: "ticket.resolved",
    description: "Orbit Resolve: ticket resolved",
    payload: getBasePayload("ticket.resolved", {
      ticket_id: "TCK-8821",
      resolved_by: "agent_smith_07"
    })
  },
  {
    type: "ticket.sla_breached",
    description: "Orbit Resolve: ticket SLA breached",
    payload: getBasePayload("ticket.sla_breached", {
      ticket_id: "TCK-8821",
      sla_type: "first_response_time",
      target_minutes: 15,
      elapsed_minutes: 22
    })
  },
  {
    type: "ticket.status_changed",
    description: "Orbit Resolve: ticket status changed",
    payload: getBasePayload("ticket.status_changed", {
      ticket_id: "TCK-8821",
      old_status: "open",
      new_status: "waiting_on_customer"
    })
  },
  {
    type: "ticket.updated",
    description: "Orbit Resolve: ticket updated",
    payload: getBasePayload("ticket.updated", {
      ticket_id: "TCK-8821",
      tags: ["auth", "sms", "escalated"]
    })
  },

  // --- Orbit Pulse Webhooks ---
  {
    type: "contact.created",
    description: "Orbit Pulse: contact created",
    payload: getBasePayload("contact.created", {
      first_name: "Sarah",
      last_name: "Connor",
      email: "sarah.c@cyberdyne.org",
      company: "Cyberdyne Systems"
    })
  },
  {
    type: "contact.deleted",
    description: "Orbit Pulse: contact deleted",
    payload: getBasePayload("contact.deleted", {
      email: "old_user@domain.com"
    })
  },
  {
    type: "contact.updated",
    description: "Orbit Pulse: contact updated",
    payload: getBasePayload("contact.updated", {
      first_name: "Sarah",
      last_name: "Connor",
      phone: "+1-555-0199"
    })
  },
  {
    type: "deal.created",
    description: "Orbit Pulse: deal created",
    payload: getBasePayload("deal.created", {
      deal_name: "Enterprise License Renewal",
      value: 120000,
      currency: "USD",
      stage: "qualification"
    })
  },
  {
    type: "deal.deleted",
    description: "Orbit Pulse: deal deleted",
    payload: getBasePayload("deal.deleted", {
      deal_name: "Test Deal"
    })
  },
  {
    type: "deal.lost",
    description: "Orbit Pulse: deal lost",
    payload: getBasePayload("deal.lost", {
      deal_name: "Competitor Switch Deal",
      value: 45000,
      reason_lost: "Budget constraints"
    })
  },
  {
    type: "deal.stage_changed",
    description: "Orbit Pulse: deal stage changed",
    payload: getBasePayload("deal.stage_changed", {
      deal_name: "Enterprise License Renewal",
      old_stage: "proposal_sent",
      new_stage: "negotiation"
    })
  },
  {
    type: "deal.updated",
    description: "Orbit Pulse: deal updated",
    payload: getBasePayload("deal.updated", {
      deal_name: "Enterprise License Renewal",
      value: 135000
    })
  },
  {
    type: "deal.won",
    description: "Orbit Pulse: deal won",
    payload: getBasePayload("deal.won", {
      deal_name: "Enterprise License Renewal",
      value: 135000,
      closed_date: new Date().toISOString()
    })
  },
  {
    type: "form.submitted",
    description: "Orbit Pulse: web form submitted",
    payload: getBasePayload("form.submitted", {
      form_id: "frm_contact_sales",
      fields: {
        name: "Alex Mercer",
        email: "alex@startup.io",
        team_size: "25-50"
      }
    })
  },
  {
    type: "lead.assigned",
    description: "Orbit Pulse: lead assigned",
    payload: getBasePayload("lead.assigned", {
      lead_id: "ld_9941",
      assigned_to_rep: "rep_jordan_12"
    })
  },
  {
    type: "lead.converted",
    description: "Orbit Pulse: lead converted",
    payload: getBasePayload("lead.converted", {
      lead_id: "ld_9941",
      contact_id: "cnt_5501",
      deal_id: "dl_7732"
    })
  },
  {
    type: "lead.created",
    description: "Orbit Pulse: lead created",
    payload: getBasePayload("lead.created", {
      lead_source: "Inbound Marketing Form",
      company_name: "Acme Corp",
      status: "new"
    })
  },
  {
    type: "lead.deleted",
    description: "Orbit Pulse: lead deleted",
    payload: getBasePayload("lead.deleted", {
      lead_id: "ld_1002"
    })
  },
  {
    type: "lead.status_changed",
    description: "Orbit Pulse: lead status changed",
    payload: getBasePayload("lead.status_changed", {
      lead_id: "ld_9941",
      old_status: "new",
      new_status: "contacted"
    })
  },
  {
    type: "lead.updated",
    description: "Orbit Pulse: lead updated",
    payload: getBasePayload("lead.updated", {
      lead_id: "ld_9941",
      estimated_value: 50000
    })
  },

  // --- Orbit Schedule Webhooks ---
  {
    type: "booking.created",
    description: "Orbit Schedule: booking created",
    payload: getBasePayload("booking.created", {
      booking_ref: "BK-9021",
      event_type: "30 Minute Discovery Call",
      invitee_email: "client@external.com",
      start_time: new Date(Date.now() + 86400000).toISOString()
    })
  },
  {
    type: "calendar.created",
    description: "Orbit Schedule: calendar created",
    payload: getBasePayload("calendar.created", {
      calendar_name: "Sales Demo Shared Calendar",
      owner_id: "usr_sales_lead"
    })
  },
  {
    type: "calendar.status_changed",
    description: "Orbit Schedule: calendar status changed",
    payload: getBasePayload("calendar.status_changed", {
      calendar_name: "Sales Demo Shared Calendar",
      status: "active"
    })
  },
  {
    type: "calendar.updated",
    description: "Orbit Schedule: calendar updated",
    payload: getBasePayload("calendar.updated", {
      timezone: "America/New_York"
    })
  },
  {
    type: "event.created",
    description: "Orbit Schedule: calendar event created",
    payload: getBasePayload("event.created", {
      title: "Product Architecture Review",
      location: "Google Meet / Remote",
      start_time: new Date(Date.now() + 3600000).toISOString(),
      end_time: new Date(Date.now() + 7200000).toISOString()
    })
  },
  {
    type: "event.deleted",
    description: "Orbit Schedule: calendar event deleted",
    payload: getBasePayload("event.deleted", {
      title: "Cancelled Weekly Sync"
    })
  },
  {
    type: "event.invitees_added",
    description: "Orbit Schedule: event invitees added",
    payload: getBasePayload("event.invitees_added", {
      event_id: "evt_arch_review",
      added_invitees: ["tech.lead@company.com", "cto@company.com"]
    })
  },
  {
    type: "event.updated",
    description: "Orbit Schedule: calendar event updated",
    payload: getBasePayload("event.updated", {
      title: "Rescheduled Architecture Review",
      new_start_time: new Date(Date.now() + 7200000).toISOString()
    })
  },

  // --- Orbit Papers Webhooks ---
  {
    type: "ai.risk.critical_detected",
    description: "Orbit Papers: AI critical risk detected",
    payload: getBasePayload("ai.risk.critical_detected", {
      document_id: "doc_contract_99",
      risk_category: "Unlimited Liability Clause",
      severity: "critical",
      excerpt: "Clause 14.2 contains un-capped indemnity terms."
    })
  },
  {
    type: "paper.comment_added",
    description: "Orbit Papers: paper comment added",
    payload: getBasePayload("paper.comment_added", {
      document_id: "doc_contract_99",
      comment_text: "Please clarify Section 3 payment terms before signing."
    })
  },
  {
    type: "paper.created",
    description: "Orbit Papers: paper created",
    payload: getBasePayload("paper.created", {
      title: "Master Services Agreement 2026",
      status: "draft"
    })
  },
  {
    type: "paper.declined",
    description: "Orbit Papers: paper declined",
    payload: getBasePayload("paper.declined", {
      document_id: "doc_contract_99",
      declined_by: "legal@client.com",
      reason: "Unacceptable indemnification clause"
    })
  },
  {
    type: "paper.expired",
    description: "Orbit Papers: paper expired",
    payload: getBasePayload("paper.expired", {
      document_id: "doc_contract_99"
    })
  },
  {
    type: "paper.finalized",
    description: "Orbit Papers: paper finalized",
    payload: getBasePayload("paper.finalized", {
      document_id: "doc_contract_99"
    })
  },
  {
    type: "paper.fully_executed",
    description: "Orbit Papers: paper fully executed",
    payload: getBasePayload("paper.fully_executed", {
      document_id: "doc_contract_99",
      execution_timestamp: new Date().toISOString(),
      signers: ["john.doe@company.com", "jane.smith@client.com"]
    })
  },
  {
    type: "paper.lifecycle_override",
    description: "Orbit Papers: paper lifecycle override",
    payload: getBasePayload("paper.lifecycle_override", {
      document_id: "doc_contract_99",
      override_action: "manual_completion"
    })
  },
  {
    type: "paper.obligation_completed",
    description: "Orbit Papers: paper obligation completed",
    payload: getBasePayload("paper.obligation_completed", {
      document_id: "doc_contract_99",
      obligation: "Deliver Quarterly Security Audit Report"
    })
  },
  {
    type: "paper.obligation_created",
    description: "Orbit Papers: paper obligation created",
    payload: getBasePayload("paper.obligation_created", {
      document_id: "doc_contract_99",
      obligation: "Deliver Quarterly Security Audit Report",
      due_date: new Date(Date.now() + 90 * 86400000).toISOString()
    })
  },
  {
    type: "paper.revoked",
    description: "Orbit Papers: paper revoked",
    payload: getBasePayload("paper.revoked", {
      document_id: "doc_contract_99",
      revoked_by: "sender@company.com"
    })
  },
  {
    type: "paper.sent",
    description: "Orbit Papers: paper sent",
    payload: getBasePayload("paper.sent", {
      document_id: "doc_contract_99",
      recipients: ["jane.smith@client.com"]
    })
  },
  {
    type: "paper.signed",
    description: "Orbit Papers: paper signed",
    payload: getBasePayload("paper.signed", {
      document_id: "doc_contract_99",
      signer_email: "jane.smith@client.com"
    })
  },
  {
    type: "paper.state_changed",
    description: "Orbit Papers: paper state changed",
    payload: getBasePayload("paper.state_changed", {
      document_id: "doc_contract_99",
      old_state: "out_for_signature",
      new_state: "partially_signed"
    })
  },
  {
    type: "paper.superseded",
    description: "Orbit Papers: paper superseded",
    payload: getBasePayload("paper.superseded", {
      document_id: "doc_contract_99",
      superseded_by_document_id: "doc_contract_100"
    })
  },

  // --- Orbit Inventory Webhooks ---
  {
    type: "category.created",
    description: "Orbit Inventory: category created",
    payload: getBasePayload("category.created", {
      category_name: "Enterprise Server Hardware",
      slug: "enterprise-server-hardware"
    })
  },
  {
    type: "category.deleted",
    description: "Orbit Inventory: category deleted",
    payload: getBasePayload("category.deleted", {
      category_name: "Obsolete Accessories"
    })
  },
  {
    type: "category.updated",
    description: "Orbit Inventory: category updated",
    payload: getBasePayload("category.updated", {
      category_name: "Enterprise Server & Storage Hardware"
    })
  },
  {
    type: "product.created",
    description: "Orbit Inventory: product created",
    payload: getBasePayload("product.created", {
      sku: "SKU-RACK-42U",
      name: "Server Rack Enclosure 42U",
      unit_price: 1299.99,
      stock_quantity: 50
    })
  },
  {
    type: "product.deleted",
    description: "Orbit Inventory: product deleted",
    payload: getBasePayload("product.deleted", {
      sku: "SKU-OLD-CABLE"
    })
  },
  {
    type: "product.updated",
    description: "Orbit Inventory: product updated",
    payload: getBasePayload("product.updated", {
      sku: "SKU-RACK-42U",
      unit_price: 1199.99
    })
  },
  {
    type: "production_order.cancelled",
    description: "Orbit Inventory: production order cancelled",
    payload: getBasePayload("production_order.cancelled", {
      order_number: "PO-7701",
      reason: "Supply chain delay"
    })
  },
  {
    type: "production_order.completed",
    description: "Orbit Inventory: production order completed",
    payload: getBasePayload("production_order.completed", {
      order_number: "PO-7701",
      units_produced: 500
    })
  },
  {
    type: "production_order.created",
    description: "Orbit Inventory: production order created",
    payload: getBasePayload("production_order.created", {
      order_number: "PO-7701",
      target_product_sku: "SKU-RACK-42U",
      quantity_to_produce: 500
    })
  },
  {
    type: "stock.adjusted",
    description: "Orbit Inventory: stock adjusted",
    payload: getBasePayload("stock.adjusted", {
      sku: "SKU-RACK-42U",
      previous_quantity: 50,
      new_quantity: 45,
      adjustment_reason: "Cycle count reconciliation"
    })
  },

  // --- Orbit Storefront Webhooks ---
  {
    type: "credit_note.issued",
    description: "Orbit Storefront: credit note issued",
    payload: getBasePayload("credit_note.issued", {
      credit_note_number: "CN-4011",
      amount: 150.00,
      currency: "USD"
    })
  },
  {
    type: "invoice.generated",
    description: "Orbit Storefront: invoice generated",
    payload: getBasePayload("invoice.generated", {
      invoice_number: "INV-9082",
      amount_due: 2499.00,
      currency: "USD",
      due_date: new Date(Date.now() + 14 * 86400000).toISOString()
    })
  },
  {
    type: "order.cancelled",
    description: "Orbit Storefront: order cancelled",
    payload: getBasePayload("order.cancelled", {
      order_number: "ORD-8812",
      reason: "Customer requested cancellation"
    })
  },
  {
    type: "order.created",
    description: "Orbit Storefront: order created",
    payload: getBasePayload("order.created", {
      order_number: "ORD-8812",
      total_amount: 349.50,
      currency: "USD",
      customer_email: "buyer@store.com",
      items_count: 3
    })
  },
  {
    type: "order.partially_refunded",
    description: "Orbit Storefront: order partially refunded",
    payload: getBasePayload("order.partially_refunded", {
      order_number: "ORD-8812",
      refunded_amount: 49.50,
      remaining_amount: 300.00
    })
  },
  {
    type: "order.payment_status_changed",
    description: "Orbit Storefront: order payment status changed",
    payload: getBasePayload("order.payment_status_changed", {
      order_number: "ORD-8812",
      old_status: "pending",
      new_status: "paid"
    })
  },
  {
    type: "order.refunded",
    description: "Orbit Storefront: order refunded",
    payload: getBasePayload("order.refunded", {
      order_number: "ORD-8812",
      refunded_amount: 349.50
    })
  },
  {
    type: "order.status_changed",
    description: "Orbit Storefront: order status changed",
    payload: getBasePayload("order.status_changed", {
      order_number: "ORD-8812",
      old_status: "processing",
      new_status: "shipped",
      tracking_number: "1Z9999999999999999"
    })
  },
  {
    type: "payment.failed",
    description: "Orbit Storefront: payment failed",
    payload: getBasePayload("payment.failed", {
      transaction_id: "txn_fail_901",
      error_message: "Insufficient funds",
      amount: 349.50
    })
  },
  {
    type: "payment.received",
    description: "Orbit Storefront: payment received",
    payload: getBasePayload("payment.received", {
      transaction_id: "txn_succ_901",
      amount: 349.50,
      payment_method: "credit_card"
    })
  },
  {
    type: "preorder.approved",
    description: "Orbit Storefront: preorder approved",
    payload: getBasePayload("preorder.approved", {
      preorder_id: "pre_5011"
    })
  },
  {
    type: "preorder.created",
    description: "Orbit Storefront: preorder created",
    payload: getBasePayload("preorder.created", {
      preorder_id: "pre_5011",
      product_sku: "SKU-FUTURE-TECH"
    })
  },
  {
    type: "preorder.rejected",
    description: "Orbit Storefront: preorder rejected",
    payload: getBasePayload("preorder.rejected", {
      preorder_id: "pre_5011"
    })
  },
  {
    type: "refund.approved",
    description: "Orbit Storefront: refund approved",
    payload: getBasePayload("refund.approved", {
      refund_id: "ref_1029",
      amount: 89.00
    })
  },
  {
    type: "refund.processed",
    description: "Orbit Storefront: refund processed",
    payload: getBasePayload("refund.processed", {
      refund_id: "ref_1029",
      amount: 89.00
    })
  },
  {
    type: "refund.rejected",
    description: "Orbit Storefront: refund rejected",
    payload: getBasePayload("refund.rejected", {
      refund_id: "ref_1029",
      reason: "Item returned past 30-day window"
    })
  },
  {
    type: "refund.requested",
    description: "Orbit Storefront: refund requested",
    payload: getBasePayload("refund.requested", {
      order_number: "ORD-8812",
      reason: "Wrong size ordered"
    })
  },
  {
    type: "review.submitted",
    description: "Orbit Storefront: review submitted",
    payload: getBasePayload("review.submitted", {
      product_sku: "SKU-RACK-42U",
      rating: 5,
      comment: "Solid construction and very easy to set up."
    })
  },

  // --- Orbit People Webhooks ---
  {
    type: "employee.onboarded",
    description: "Orbit People: employee onboarded",
    payload: getBasePayload("employee.onboarded", {
      employee_id: "emp_1042",
      full_name: "Morgan Vance",
      department: "Engineering",
      title: "Senior Backend Developer"
    })
  },
  {
    type: "expense.approved",
    description: "Orbit People: expense approved",
    payload: getBasePayload("expense.approved", {
      expense_id: "exp_8831",
      amount: 450.00,
      category: "Travel & Lodging"
    })
  },
  {
    type: "expense.rejected",
    description: "Orbit People: expense rejected",
    payload: getBasePayload("expense.rejected", {
      expense_id: "exp_8831",
      reason: "Missing itemized receipt"
    })
  },
  {
    type: "expense.submitted",
    description: "Orbit People: expense submitted",
    payload: getBasePayload("expense.submitted", {
      expense_id: "exp_8831",
      amount: 450.00,
      employee_id: "emp_1042"
    })
  },
  {
    type: "leave.approved",
    description: "Orbit People: leave approved",
    payload: getBasePayload("leave.approved", {
      leave_id: "lv_4011",
      days_count: 5,
      type: "vacation"
    })
  },
  {
    type: "leave.cancelled",
    description: "Orbit People: leave cancelled",
    payload: getBasePayload("leave.cancelled", {
      leave_id: "lv_4011"
    })
  },
  {
    type: "leave.rejected",
    description: "Orbit People: leave rejected",
    payload: getBasePayload("leave.rejected", {
      leave_id: "lv_4011",
      reason: "Overlapping team coverage required"
    })
  },
  {
    type: "leave.submitted",
    description: "Orbit People: leave submitted",
    payload: getBasePayload("leave.submitted", {
      leave_id: "lv_4011",
      start_date: new Date(Date.now() + 14 * 86400000).toISOString(),
      end_date: new Date(Date.now() + 19 * 86400000).toISOString()
    })
  }
];
