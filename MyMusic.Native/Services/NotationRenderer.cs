using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Maui.Graphics;

namespace MyMusic.Native.Services;

public static class NotationRenderer
{
    // ── Layout constants ────────────────────────────────────────────
    private const float LeftMargin = 70f;
    private const float RightMargin = 24f;
    private const float TopMargin = 50f;
    private const float LineSpacing = 10f;
    private const float StaffGap = 70f;
    private const float NoteHeadWidth = 10f;
    private const float NoteHeadHeight = 8f;
    private const float StemLength = 32f;
    private const float DynamicOffsetY = 24f;
    private const float StaccatoDotRadius = 2f;
    private const float LedgerLineExtension = 6f;
    private const float ClefAreaWidth = 46f;

    // ── Colors ──────────────────────────────────────────────────────
    private static readonly Color BgColor = Color.FromArgb("#fefcf3");
    private static readonly Color StaffColor = Color.FromArgb("#a0998a");
    private static readonly Color NoteColor = Color.FromArgb("#2d2520");
    private static readonly Color BarLineColor = Color.FromArgb("#8a8478");
    private static readonly Color DynamicColor = Color.FromArgb("#b44040");
    private static readonly Color ClefColor = Color.FromArgb("#4a4440");
    private static readonly Color TimeSigColor = Color.FromArgb("#3a3530");
    private static readonly Color BracketColor = Color.FromArgb("#6a6458");
    private static readonly Color SlurColor = Color.FromArgb("#5a5450");

    // ── Staff position mapping (relative to C4=0) ───────────────────
    private static int StaffPosition(int scaleDegree, int octave) =>
        scaleDegree + (octave - 4) * 7;

    private static float NoteY(int staffPos, float trebleBottom)
    {
        float halfSpace = LineSpacing / 2f;
        return trebleBottom + (2 - staffPos) * halfSpace;
    }

    // ── Render ──────────────────────────────────────────────────────
    public static void Render(ICanvas canvas, MusicScore score, float width, float height)
    {
        canvas.FillColor = BgColor;
        canvas.FillRectangle(0, 0, width, height);

        float trebleTop = TopMargin;
        float trebleBottom = TopMargin + 4 * LineSpacing;
        float bassTop = TopMargin + 4 * LineSpacing + StaffGap;
        float bassBottom = bassTop + 4 * LineSpacing;
        float staffRight = width - RightMargin;

        // ── Staff lines ───────────────────────────────────────────────
        canvas.StrokeColor = StaffColor;
        canvas.StrokeSize = 0.8f;

        for (int i = 0; i < 5; i++)
        {
            float y = trebleTop + i * LineSpacing;
            canvas.DrawLine(LeftMargin, y, staffRight, y);
        }
        for (int i = 0; i < 5; i++)
        {
            float y = bassTop + i * LineSpacing;
            canvas.DrawLine(LeftMargin, y, staffRight, y);
        }

        // ── Bracket ──────────────────────────────────────────────────
        canvas.StrokeColor = BracketColor;
        canvas.StrokeSize = 2.5f;
        canvas.DrawLine(LeftMargin - 2, trebleTop, LeftMargin - 2, bassBottom);
        // Small serifs
        canvas.StrokeSize = 1.5f;
        canvas.DrawLine(LeftMargin - 2, trebleTop, LeftMargin + 4, trebleTop);
        canvas.DrawLine(LeftMargin - 2, bassBottom, LeftMargin + 4, bassBottom);

        // ── Clefs (hand-drawn) ─────────────────────────────────────
        DrawTrebleClef(canvas, LeftMargin + 4, trebleTop, trebleBottom);
        DrawBassClef(canvas, LeftMargin + 4, bassTop, bassBottom);

        // ── Key label ────────────────────────────────────────────────
        canvas.FontSize = 11f;
        canvas.FontColor = Color.FromArgb("#8a8478");
        string mode = Generator.ParseMode(score.Key);
        canvas.DrawString(score.Key, LeftMargin + 2, trebleTop - 16, 80, 14,
                          HorizontalAlignment.Left, VerticalAlignment.Top);

        // ── Time signature ───────────────────────────────────────────
        var tsParts = score.TimeSig.Split('/');
        canvas.FontSize = 18f;
        canvas.FontColor = TimeSigColor;
        float tsX = LeftMargin + ClefAreaWidth - 10;
        canvas.DrawString(tsParts[0], tsX, trebleTop + 2, 18, 18,
                          HorizontalAlignment.Center, VerticalAlignment.Top);
        canvas.DrawString(tsParts[1], tsX, trebleTop + LineSpacing * 2 + 2, 18, 18,
                          HorizontalAlignment.Center, VerticalAlignment.Top);
        canvas.DrawString(tsParts[0], tsX, bassTop + 2, 18, 18,
                          HorizontalAlignment.Center, VerticalAlignment.Top);
        canvas.DrawString(tsParts[1], tsX, bassTop + LineSpacing * 2 + 2, 18, 18,
                          HorizontalAlignment.Center, VerticalAlignment.Top);

        // ── Note layout ──────────────────────────────────────────────
        int totalEighths = 0;
        foreach (var m in score.RhMeasures)
            foreach (var n in m.Notes)
                totalEighths += n.DurationEighths;

        float notesStartX = LeftMargin + ClefAreaWidth + 10;
        float availableWidth = staffRight - notesStartX - 10;
        float eighthWidth = totalEighths > 0 ? availableWidth / totalEighths : 20f;
        eighthWidth = Math.Max(eighthWidth, 12f);

        // ── Draw notes ───────────────────────────────────────────────
        DrawVoice(canvas, score.RhMeasures, notesStartX, eighthWidth, trebleBottom, true,
                  staffRight, trebleTop, trebleBottom);
        DrawVoice(canvas, score.LhMeasures, notesStartX, eighthWidth, trebleBottom, false,
                  staffRight, bassTop, bassBottom);

        // ── Final double bar ─────────────────────────────────────────
        float endX = notesStartX + totalEighths * eighthWidth + 4;
        endX = Math.Min(endX, staffRight);
        canvas.StrokeColor = BarLineColor;
        canvas.StrokeSize = 1.5f;
        canvas.DrawLine(endX, trebleTop, endX, trebleBottom);
        canvas.DrawLine(endX, bassTop, endX, bassBottom);
        canvas.StrokeSize = 3f;
        canvas.DrawLine(endX + 4, trebleTop, endX + 4, trebleBottom);
        canvas.DrawLine(endX + 4, bassTop, endX + 4, bassBottom);
    }

    private static void DrawVoice(
        ICanvas canvas,
        Measure[] measures,
        float startX,
        float eighthWidth,
        float trebleBottom,
        bool isTreble,
        float staffRight,
        float staffTop,
        float staffBottom)
    {
        float x = startX;
        var slurStarts = new List<(float x, float y)>();

        for (int mi = 0; mi < measures.Length; mi++)
        {
            var measure = measures[mi];

            for (int ni = 0; ni < measure.Notes.Length; ni++)
            {
                var note = measure.Notes[ni];
                float noteDuration = note.DurationEighths * eighthWidth;
                float noteX = x + noteDuration / 2f;

                if (note.IsRest)
                {
                    // Rest: simple dash
                    float restY = (staffTop + staffBottom) / 2f;
                    canvas.StrokeColor = NoteColor;
                    canvas.StrokeSize = 2f;
                    if (note.DurationEighths >= 4)
                    {
                        // Half/whole rest: filled rectangle
                        float midLineY = staffTop + 2 * LineSpacing;
                        canvas.FillColor = NoteColor;
                        if (note.DurationEighths >= 8)
                            canvas.FillRectangle(noteX - 6, midLineY, 12, LineSpacing / 2);
                        else
                            canvas.FillRectangle(noteX - 6, midLineY - LineSpacing / 2, 12, LineSpacing / 2);
                    }
                    else
                    {
                        // Quarter/eighth rest: stylized line
                        canvas.DrawLine(noteX - 3, restY - 8, noteX + 3, restY);
                        canvas.DrawLine(noteX + 3, restY, noteX - 3, restY + 8);
                    }

                    if (note.Dynamic != null)
                        DrawDynamic(canvas, note.Dynamic, noteX, staffBottom);

                    x += noteDuration;
                    continue;
                }

                int staffPos = StaffPosition(note.ScaleDegree, note.Octave);
                float noteY = NoteY(staffPos, trebleBottom);

                // Ledger lines
                DrawLedgerLines(canvas, staffPos, noteX, trebleBottom, isTreble);

                // Note head
                bool isOpen = note.DurationEighths >= 4;
                if (isOpen)
                {
                    canvas.StrokeColor = NoteColor;
                    canvas.StrokeSize = 1.6f;
                    canvas.DrawEllipse(noteX - NoteHeadWidth / 2, noteY - NoteHeadHeight / 2,
                                       NoteHeadWidth, NoteHeadHeight);
                }
                else
                {
                    canvas.FillColor = NoteColor;
                    canvas.FillEllipse(noteX - NoteHeadWidth / 2, noteY - NoteHeadHeight / 2,
                                       NoteHeadWidth, NoteHeadHeight);
                }

                // Stem
                if (note.DurationEighths < 8)
                {
                    bool stemUp = isTreble ? staffPos < 6 : staffPos < -8;
                    float stemX = stemUp ? noteX + NoteHeadWidth / 2 - 1 : noteX - NoteHeadWidth / 2 + 1;
                    float stemEndY = stemUp ? noteY - StemLength : noteY + StemLength;

                    canvas.StrokeSize = 1.2f;
                    canvas.StrokeColor = NoteColor;
                    canvas.DrawLine(stemX, noteY, stemX, stemEndY);

                    // Flag for eighth notes
                    if (note.DurationEighths == 1)
                    {
                        float flagDir = stemUp ? 1 : -1;
                        var path = new PathF();
                        path.MoveTo(stemX, stemEndY);
                        path.QuadTo(stemX + 8, stemEndY + 4 * flagDir, stemX + 4, stemEndY + 12 * flagDir);
                        canvas.StrokeSize = 1.5f;
                        canvas.DrawPath(path);
                    }
                }

                // Staccato dot
                if (note.Staccato)
                {
                    bool stemUp = isTreble ? staffPos < 6 : staffPos < -8;
                    float dotY = stemUp ? noteY + NoteHeadHeight / 2 + 6 : noteY - NoteHeadHeight / 2 - 6;
                    canvas.FillColor = NoteColor;
                    canvas.FillCircle(noteX, dotY, StaccatoDotRadius);
                }

                // Slurs
                if (note.SlurStart)
                    slurStarts.Add((noteX, noteY));
                if (note.SlurEnd && slurStarts.Count > 0)
                {
                    var start = slurStarts[^1];
                    slurStarts.RemoveAt(slurStarts.Count - 1);
                    DrawSlur(canvas, start.x, start.y, noteX, noteY, isTreble ? -1 : 1);
                }

                // Dynamic
                if (note.Dynamic != null)
                    DrawDynamic(canvas, note.Dynamic, noteX, staffBottom);

                x += noteDuration;
            }

            // Bar line
            if (mi < measures.Length - 1)
            {
                canvas.StrokeSize = 0.8f;
                canvas.StrokeColor = BarLineColor;
                canvas.DrawLine(x + 2, staffTop, x + 2, staffBottom);
                x += 6;
            }
        }
    }

    private static void DrawDynamic(ICanvas canvas, string dyn, float x, float staffBottom)
    {
        canvas.FontSize = 12f;
        canvas.FontColor = DynamicColor;
        canvas.DrawString(dyn, x - 10, staffBottom + DynamicOffsetY - 4, 24, 14,
                          HorizontalAlignment.Center, VerticalAlignment.Top);
    }

    private static void DrawSlur(ICanvas canvas, float x1, float y1, float x2, float y2, int dir)
    {
        float midX = (x1 + x2) / 2f;
        float midY = (y1 + y2) / 2f + dir * 16f;

        canvas.StrokeColor = SlurColor;
        canvas.StrokeSize = 1.4f;

        var path = new PathF();
        path.MoveTo(x1, y1 + dir * 8);
        path.QuadTo(midX, midY, x2, y2 + dir * 8);
        canvas.DrawPath(path);
    }

    private static void DrawLedgerLines(ICanvas canvas, int staffPos, float noteX, float trebleBottom, bool isTreble)
    {
        canvas.StrokeColor = StaffColor;
        canvas.StrokeSize = 0.8f;
        float halfW = NoteHeadWidth / 2 + LedgerLineExtension;

        if (isTreble)
        {
            if (staffPos <= 0)
            {
                for (int p = 0; p >= staffPos; p -= 2)
                {
                    float ly = NoteY(p, trebleBottom);
                    canvas.DrawLine(noteX - halfW, ly, noteX + halfW, ly);
                }
            }
            if (staffPos >= 12)
            {
                for (int p = 12; p <= staffPos; p += 2)
                {
                    float ly = NoteY(p, trebleBottom);
                    canvas.DrawLine(noteX - halfW, ly, noteX + halfW, ly);
                }
            }
        }
        else
        {
            if (staffPos >= 0)
            {
                for (int p = 0; p <= staffPos; p += 2)
                {
                    float ly = NoteY(p, trebleBottom);
                    canvas.DrawLine(noteX - halfW, ly, noteX + halfW, ly);
                }
            }
            if (staffPos <= -12)
            {
                for (int p = -12; p >= staffPos; p -= 2)
                {
                    float ly = NoteY(p, trebleBottom);
                    canvas.DrawLine(noteX - halfW, ly, noteX + halfW, ly);
                }
            }
        }
    }

    // ── Treble clef (drawn with bezier curves) ──────────────────────
    // Anchored to G line (second from bottom = trebleBottom - LineSpacing)
    private static void DrawTrebleClef(ICanvas canvas, float x, float staffTop, float staffBottom)
    {
        float gLineY = staffBottom - LineSpacing; // G4 line
        float cx = x + 10; // horizontal center of clef

        canvas.StrokeColor = ClefColor;
        canvas.StrokeSize = 2f;

        // Main vertical stroke from below staff to above
        float bottom = staffBottom + LineSpacing * 1.5f;
        float top = staffTop - LineSpacing * 1.2f;

        // 1) Vertical spine (slight curve)
        var spine = new PathF();
        spine.MoveTo(cx + 1, bottom);
        spine.CurveTo(cx - 2, staffBottom, cx + 2, staffTop, cx, top);
        canvas.DrawPath(spine);

        // 2) Upper curl (loops right from top, curves down to G line area)
        var upper = new PathF();
        upper.MoveTo(cx, top);
        upper.CurveTo(cx + 16, staffTop - LineSpacing, cx + 18, staffTop + LineSpacing * 2, cx, gLineY + 2);
        canvas.DrawPath(upper);

        // 3) Lower curl (from G line area, loops left and down, curls back)
        var lower = new PathF();
        lower.MoveTo(cx, gLineY + 2);
        lower.CurveTo(cx - 16, gLineY + LineSpacing * 2, cx - 14, staffBottom + LineSpacing * 2, cx + 1, bottom);
        canvas.DrawPath(lower);

        // 4) Small filled dot at bottom curl
        canvas.FillColor = ClefColor;
        canvas.FillCircle(cx + 1, bottom, 2.5f);
    }

    // ── Bass clef (F clef) ──────────────────────────────────────────
    // Anchored to F line (second from top = bassTop + LineSpacing)
    private static void DrawBassClef(ICanvas canvas, float x, float bassTop, float bassBottom)
    {
        float fLineY = bassTop + LineSpacing; // F3 line
        float cx = x + 8;

        canvas.StrokeColor = ClefColor;
        canvas.StrokeSize = 2f;

        // 1) Filled dot on F line
        canvas.FillColor = ClefColor;
        canvas.FillCircle(cx, fLineY, 3f);

        // 2) Curve: from the dot, arcs up-right, then sweeps down past the staff
        var curve = new PathF();
        curve.MoveTo(cx + 3, fLineY);
        curve.CurveTo(cx + 18, fLineY - LineSpacing * 2.5f,
                       cx + 20, fLineY + LineSpacing * 1.5f,
                       cx + 2, bassBottom - LineSpacing * 0.3f);
        canvas.DrawPath(curve);

        // 3) Two dots to the right of F line (above and below)
        float dotsX = cx + 16;
        canvas.FillCircle(dotsX, fLineY - LineSpacing * 0.5f, 2f);
        canvas.FillCircle(dotsX, fLineY + LineSpacing * 0.5f, 2f);
    }
}
