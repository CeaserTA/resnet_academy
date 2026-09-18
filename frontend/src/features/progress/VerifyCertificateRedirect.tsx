import { Navigate, useSearchParams } from 'react-router';

/**
 * `/verify-certificate` is the address printed on certificates and encoded in their QR codes, so
 * it has to keep working for as long as any certificate is in circulation. Verification itself is
 * a modal on the public site rather than a page, so this forwards to the home page carrying the
 * certificate number, which the footer picks up to open the modal on the result.
 */
export function VerifyCertificateRedirect() {
    const [searchParams] = useSearchParams();
    const number = searchParams.get('number')?.trim();

    return <Navigate to={number ? `/?verify=${encodeURIComponent(number)}` : '/'} replace />;
}
