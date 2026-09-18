<?php

declare(strict_types=1);

namespace App\Services\Certification;

use BaconQrCode\Common\ErrorCorrectionLevel;
use BaconQrCode\Encoder\Encoder;


/**
 * Builds the certificate's graphics as SVG data URIs for the PDF template.
 *
 * Everything here is vector on purpose: dompdf only rasterises PNG/JPEG through ext-gd, which
 * isn't guaranteed to be loaded (it isn't in this project's dev environment), whereas SVG is
 * drawn by php-svg-lib, a hard dependency of dompdf itself. Vector also keeps the QR code crisp
 * at any print size, which matters because it has to survive being scanned off paper.
 */
final class CertificateArtwork
{
    /** Quiet zone required around a QR code for reliable scanning, in modules. */
    private const QR_QUIET_ZONE = 4;

    /**
     * The graduation cap from the site header/footer (lucide `graduation-cap`), so the
     * certificate carries the same mark as the website.
     */
    public function logo(string $color = '#3b82f6', float $strokeWidth = 1.6): string
    {
        // fill="none" is repeated on every path rather than set once on the <svg>: php-svg-lib
        // does not inherit presentation attributes from the root element, so without it each
        // path comes out as a solid silhouette instead of lucide's outline.
        return $this->dataUri(<<<SVG
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <g fill="none" stroke="{$color}" stroke-width="{$strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
                    <path fill="none" d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>
                    <path fill="none" d="M22 10v6"/>
                    <path fill="none" d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
                </g>
            </svg>
            SVG);
    }

    /**
     * A QR code for the verification URL, as SVG rectangles.
     *
     * BaconQrCode's own SVG writer emits `<use>`/`<defs>`, which php-svg-lib does not implement —
     * the code would come out blank. Reading the matrix and emitting plain rects avoids that
     * entirely and produces a smaller file.
     */
    public function qrCode(string $text, string $color = '#0f172a'): string
    {
        $matrix = Encoder::encode($text, ErrorCorrectionLevel::M(), Encoder::DEFAULT_BYTE_MODE_ENCODING)
            ->getMatrix();

        $size = $matrix->getWidth() + (self::QR_QUIET_ZONE * 2);
        $rects = '';

        for ($y = 0; $y < $matrix->getHeight(); $y++) {
            for ($x = 0; $x < $matrix->getWidth(); $x++) {
                if ($matrix->get($x, $y) !== 1) {
                    continue;
                }

                $left = $x + self::QR_QUIET_ZONE;
                $top = $y + self::QR_QUIET_ZONE;
                // Drawn a hair over 1 module wide so neighbouring modules meet rather than
                // leaving hairline gaps that confuse scanners at small print sizes.
                $rects .= "<rect x=\"{$left}\" y=\"{$top}\" width=\"1.02\" height=\"1.02\" fill=\"{$color}\"/>";
            }
        }

        return $this->dataUri(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '.$size.' '.$size.'" shape-rendering="crispEdges">'
            .'<rect width="'.$size.'" height="'.$size.'" fill="#ffffff"/>'
            .$rects
            .'</svg>'
        );
    }

    /**
     * Placeholder handwritten signature. Swap for a scanned signature (as SVG, or PNG once
     * ext-gd is available) when there is a real one to use.
     */
    public function signature(string $color = '#1e293b'): string
    {
        return $this->dataUri(<<<SVG
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 70">
                <g fill="none" stroke="{$color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <path fill="none" d="M12 52c14-6 20-20 22-32 1-6-4-8-7-3-4 7-5 22-2 32 2 7 7 9 11 4 5-6 8-16 10-24"/>
                    <path fill="none" d="M46 46c5-1 9-5 12-10 2-4-1-7-4-4-4 4-5 12-2 16 3 4 9 2 13-3 3-4 5-9 6-13"/>
                    <path fill="none" d="M76 34c4 8 3 16-1 20-3 3-7 1-6-4 1-6 6-11 12-14 7-4 14-5 20-3"/>
                    <path fill="none" d="M112 44c6-3 11-9 14-15 2-5-2-8-5-4-4 5-6 15-3 21 3 5 9 4 13-1 4-4 7-11 9-18"/>
                    <path fill="none" d="M150 48c6-2 12-7 16-13 3-5 0-9-4-5-4 5-5 14-2 19 4 6 14 5 22-1"/>
                    <path fill="none" d="M18 62c40 6 100 5 150-4"/>
                </g>
            </svg>
            SVG);
    }

    /**
     * Placeholder official seal. Concentric rings with a serrated edge and the institution's
     * initial — a stand-in for a real embossed seal graphic.
     */
    public function seal(string $primary = '#1d4ed8', string $accent = '#93c5fd'): string
    {
        $teeth = '';
        for ($i = 0; $i < 48; $i++) {
            $angle = ($i / 48) * 2 * M_PI;
            $x = 60 + (cos($angle) * 56);
            $y = 60 + (sin($angle) * 56);
            $teeth .= sprintf('<circle cx="%.2f" cy="%.2f" r="2.6" fill="%s"/>', $x, $y, $accent);
        }

        return $this->dataUri(<<<SVG
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
                {$teeth}
                <circle cx="60" cy="60" r="50" fill="none" stroke="{$primary}" stroke-width="2.5"/>
                <circle cx="60" cy="60" r="43" fill="none" stroke="{$primary}" stroke-width="1"/>
                <circle cx="60" cy="60" r="30" fill="{$primary}" opacity="0.08"/>
                <path d="M60 34l24 11-24 11-24-11z" fill="{$primary}"/>
                <path d="M46 52v9c0 6 6 10 14 10s14-4 14-10v-9" fill="none" stroke="{$primary}" stroke-width="3"
                      stroke-linecap="round"/>
                <path d="M86 45v13" fill="none" stroke="{$primary}" stroke-width="3" stroke-linecap="round"/>
                <path d="M40 86h40" fill="none" stroke="{$primary}" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            SVG);
    }

    /**
     * Faint background mark. Tinted rather than made transparent, because dompdf's `opacity`
     * support on images is unreliable while a pale stroke colour always prints.
     */
    public function watermark(string $color = '#f1f6fe'): string
    {
        return $this->logo($color, 0.55);
    }

    private function dataUri(string $svg): string
    {
        return 'data:image/svg+xml;base64,'.base64_encode(trim($svg));
    }
}
