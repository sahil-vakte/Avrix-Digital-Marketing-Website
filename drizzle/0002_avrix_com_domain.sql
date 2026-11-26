UPDATE applications SET domain = 'avrixdigital.com', record_url_template = 'https://avrixdigital.com/manage-7f3k/enquiries/enquiry/{id}/change/' WHERE key = 'avrix-digital';
--> statement-breakpoint
UPDATE applications SET webhook_url = replace(webhook_url, '://avrixdigital.co.uk/', '://avrixdigital.com/') WHERE key = 'avrix-digital' AND webhook_url LIKE 'https://avrixdigital.co.uk/%';
