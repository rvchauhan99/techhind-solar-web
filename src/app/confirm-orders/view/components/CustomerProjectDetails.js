"use client";

import { Box, Chip, Grid, Typography } from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import moment from "moment";
import { COMPACT_SECTION_HEADER_CLASS } from "@/utils/formConstants";

export default function CustomerProjectDetails({ orderData }) {
  return (
    <>
      <div className={COMPACT_SECTION_HEADER_CLASS}>Customer Details</div>
      <Box mt={2} mb={2}>
        <Typography variant="body2" color="text.secondary">
          Order No:
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="body1" color="primary" fontWeight="bold">
            {orderData?.order_number || "N/A"}
          </Typography>
          {(() => {
            const status = orderData?.delivery_status || "pending";
            let color = "default";
            let label = "Delivery: Pending";
            if (status === "partial") {
              color = "warning";
              label = "Delivery: Partial";
            } else if (status === "complete") {
              color = "success";
              label = "Delivery: Complete";
            }
            return (
              <Chip
                size="small"
                color={color}
                label={label}
                sx={{ fontSize: "0.7rem", height: 20 }}
              />
            );
          })()}
        </Box>
        <Typography variant="body2" color="text.secondary" mt={2}>
          Name:
        </Typography>
        <Typography variant="body1" color="primary" fontWeight="bold">
          {orderData?.customer_name || "N/A"}
        </Typography>

        <Typography variant="body2" color="text.secondary" mt={2}>
          Mobile No:
        </Typography>
        <Typography variant="body1" display="flex" alignItems="center" gap={0.5}>
          <PhoneIcon fontSize="small" color="primary" />
          {orderData?.mobile_number || "N/A"}
        </Typography>

        <Typography variant="body2" color="text.secondary" mt={2}>
          Address:
        </Typography>
        <Typography variant="body1">{orderData?.address || "N/A"}</Typography>

        <Typography variant="body2" color="text.secondary" mt={2}>
          Reference:
        </Typography>
        <Typography variant="body1">{orderData?.reference_from || "N/A"}</Typography>

        <Typography variant="body2" color="text.secondary" mt={2}>
          Channel Partner:
        </Typography>
        <Typography variant="body1">{orderData?.channel_partner_name || "N/A"}</Typography>

        <Typography variant="body2" color="text.secondary" mt={2}>
          Handled By:
        </Typography>
        <Typography variant="body1" fontWeight="bold">
          {orderData?.handled_by_name || "N/A"}
        </Typography>

        <Typography variant="body2" color="text.secondary" mt={2}>
          Branch:
        </Typography>
        <Typography variant="body1" fontWeight="bold">
          {orderData?.branch_name || "N/A"}
        </Typography>
      </Box>

      <div className={COMPACT_SECTION_HEADER_CLASS}>Project Details</div>
      <Box mt={2} mb={2}>
        <Typography variant="body2" color="text.secondary">
          Order Date:
        </Typography>
        <Typography variant="body1" fontWeight="bold">
          {orderData?.order_date ? moment(orderData.order_date).format("DD-MM-YYYY") : "N/A"}
        </Typography>

        <Typography variant="body2" color="text.secondary" mt={2}>
          Consumer No:
        </Typography>
        <Typography variant="body1" fontWeight="bold">
          {orderData?.consumer_no || "N/A"}
        </Typography>

        <Grid container spacing={2} mt={1}>
          <Grid size={6}>
            <Typography variant="body2" color="text.secondary">
              Capacity:
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {orderData?.capacity || "N/A"}
            </Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="body2" color="text.secondary">
              Order Type:
            </Typography>
            <Chip label={orderData?.order_type_name || "New"} color="success" size="small" />
          </Grid>
        </Grid>

        <Typography variant="body2" color="text.secondary" mt={2}>
          Scheme:
        </Typography>
        <Typography variant="body1" fontWeight="bold">
          {orderData?.project_scheme_name || "N/A"}
        </Typography>

        <Typography variant="body2" color="text.secondary" mt={2}>
          Application:
        </Typography>
        <Typography variant="body1">{orderData?.application_no || "N/A"}</Typography>

        <Typography variant="body2" color="text.secondary" mt={2}>
          Registration Date:
        </Typography>
        <Typography variant="body1">
          {orderData?.date_of_registration_gov
            ? moment(orderData.date_of_registration_gov).format("DD-MM-YYYY")
            : "N/A"}
        </Typography>

        <Typography variant="body2" color="text.secondary" mt={2}>
          Discom:
        </Typography>
        <Typography variant="body1" fontWeight="bold">
          {orderData?.discom_name || "N/A"}
        </Typography>
      </Box>
    </>
  );
}

