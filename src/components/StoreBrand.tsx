import { STORE_NAME } from '../data/brand';

export default function StoreBrand({ companyName = STORE_NAME }: { companyName?: string }) {
  const hasOriginalBrand = companyName === STORE_NAME;
  return (
    <a className="trama-brand" href="/" aria-label={`${companyName}, inicio`}>
      {hasOriginalBrand && <img className="brand-logo" src="/images/somos-mayoristas/logo.webp" width={166} height={166} alt="" />}
      <span className="brand-wordmark" data-company-name>{hasOriginalBrand ? <>Somos<small>MAYORISTAS</small></> : companyName}</span>
    </a>
  );
}
