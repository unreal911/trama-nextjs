import { STORE_NAME } from '../data/brand';

export default function StoreBrand() {
  return (
    <a className="trama-brand" href="/" aria-label={`${STORE_NAME}, inicio`}>
      <img className="brand-logo" src="/images/somos-mayoristas/logo.webp" width={166} height={166} alt="" />
      <span className="brand-wordmark">Somos<small>MAYORISTAS</small></span>
    </a>
  );
}
