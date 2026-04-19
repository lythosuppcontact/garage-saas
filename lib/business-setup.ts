import { BusinessType } from "@/lib/business-types";

type CompanyStarterSetup = {
  business_type: BusinessType;
  default_vat_rate: number;
  currency: string;
  timezone: string;
};

export function getBusinessStarterSetup(
  businessType: BusinessType
): CompanyStarterSetup {
  return {
    business_type: businessType,
    default_vat_rate: 8.1,
    currency: "CHF",
    timezone: "Europe/Zurich",
  };
}