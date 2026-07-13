package app.ironlog.local;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class ImageSaverPluginTest {
    @Test
    public void sanitizesShareImageFileNamesBeforeWritingToPublicPictures() {
        assertEquals("ironlog-workout.png", ImageSaverPlugin.safeFileName(null));
        assertEquals("unsafe-name.png", ImageSaverPlugin.safeFileName("../unsafe name"));
        assertEquals("training.png", ImageSaverPlugin.safeFileName("training.png"));
    }
}
