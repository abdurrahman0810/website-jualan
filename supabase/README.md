# Database integration status

The standalone schema in `drafts/standalone_schema_DO_NOT_APPLY.sql` is a superseded draft. Do not apply it: the existing cashier already owns the product, variant, order, and stock tables.

The online storefront must use the cashier's existing Supabase project and existing tables/RPCs. Before creating or running any database migration, inspect the current database function definitions and table constraints, then add only the online channel and buyer access required by the cashier schema.

The cashier source project is `C:\Users\imana\Documents\landing-page-hebbuna\landing-page-hebbuna`. The code calls `proses_checkout` for POS orders and reads `orders.order_source` (`pos` vs online) in its history view.
