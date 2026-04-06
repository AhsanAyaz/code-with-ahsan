import { NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import {
    deleteDiscordChannel,
    isDiscordConfigured,
} from '@/lib/discord'

/** Result for a single channel deletion attempt. */
interface ChannelDeletionResult {
    sessionId: string
    channelId: string
    success: boolean
    error?: string
}

// DELETE /api/mentorship/admin/sessions/delete-archived-channels

/**
 * Bulk-deletes all Discord channels belonging to mentorship sessions that are
 * in a terminal state ("completed" or "cancelled").
 *
 * Strategy:
 *  1. Query Firestore for every session whose status is completed OR cancelled
 *     and that still has a `discordChannelId` stored on it.
 *  2. Attempt to delete each Discord channel via the bot (rate-limit safe).
 *  3. On success, clear `discordChannelId` / `discordChannelUrl` from the
 *     Firestore document so we never try to delete the same channel again.
 *  4. Return a summary of how many were deleted vs. how many failed.
 *
 * The endpoint is intentionally idempotent — channels that Discord has already
 * removed return a 404 which our `deleteDiscordChannel` helper treats as success.
 */
export async function DELETE() {
    try {
        // Guard: Discord must be configured
        if (!isDiscordConfigured()) {
            return NextResponse.json(
                { error: 'Discord integration is not configured on this server.' },
                { status: 503 }
            )
        }

        // Find sessions with a discord channel in a terminal state
        const [completedSnapshot, cancelledSnapshot] = await Promise.all([
            db
                .collection('mentorship_sessions')
                .where('status', '==', 'completed')
                .get(),
            db
                .collection('mentorship_sessions')
                .where('status', '==', 'cancelled')
                .get(),
        ])

        // Merge both result sets, deduplicate by document ID, and keep only those
        // that still reference a Discord channel.
        const sessionDocs = new Map<
            string,
            FirebaseFirestore.QueryDocumentSnapshot
        >()

        for (const doc of [...completedSnapshot.docs, ...cancelledSnapshot.docs]) {
            const data = doc.data()
            if (data.discordChannelId) {
                sessionDocs.set(doc.id, doc)
            }
        }

        if (sessionDocs.size === 0) {
            // Nothing to do – return early with a clear message.
            return NextResponse.json(
                {
                    success: true,
                    message: 'No archived channels found to delete.',
                    deleted: 0,
                    failed: 0,
                    results: [],
                },
                { status: 200 }
            )
        }

        // Delete each channel, collecting results
        const results: ChannelDeletionResult[] = []

        for (const [sessionId, doc] of sessionDocs) {
            const { discordChannelId } = doc.data() as { discordChannelId: string }

            try {
                const deleted = await deleteDiscordChannel(
                    discordChannelId,
                    'Admin bulk-delete of archived mentorship channels'
                )

                if (deleted) {
                    // Clear the channel reference in Firestore
                    await doc.ref.update({
                        discordChannelId: null,
                        discordChannelUrl: null,
                        channelDeletedAt: new Date(),
                        channelDeletedBy: 'admin_bulk_cleanup',
                    })

                    results.push({ sessionId, channelId: discordChannelId, success: true })
                } else {
                    results.push({
                        sessionId,
                        channelId: discordChannelId,
                        success: false,
                        error: 'Discord API returned a failure response',
                    })
                }
            } catch (err) {
                // Individual failures should not abort the whole batch.
                const message = err instanceof Error ? err.message : String(err)
                results.push({
                    sessionId,
                    channelId: discordChannelId,
                    success: false,
                    error: message,
                })
            }
        }

        // Build summary
        const deleted = results.filter((r) => r.success).length
        const failed = results.filter((r) => !r.success).length

        return NextResponse.json(
            {
                success: true,
                message: `Bulk cleanup complete. Deleted: ${deleted}, Failed: ${failed}.`,
                deleted,
                failed,
                results,
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('[Admin] Error during bulk channel deletion:', error)
        return NextResponse.json(
            { error: 'An unexpected error occurred during bulk channel deletion.' },
            { status: 500 }
        )
    }
}
