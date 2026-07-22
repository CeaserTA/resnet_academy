<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Enrolment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

final class EnrolmentConfirmed extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Enrolment $enrolment) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "You're confirmed for {$this->enrolment->course->title}",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.enrolment-confirmed');
    }
}
