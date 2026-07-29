package com.trainingapp.integration.wger;

import com.trainingapp.integration.wger.client.WgerExerciseClient;
import com.trainingapp.integration.wger.config.WgerProperties;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.util.StreamUtils;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class WgerExerciseClientTest {
    @Test
    void requestsConfiguredPageAndParsesCurrentOpenApiShape() throws Exception {
        var builder = RestClient.builder().baseUrl("https://wger.de/api/v2");
        var server = MockRestServiceServer.bindTo(builder).build();
        String fixture = StreamUtils.copyToString(
                getClass().getResourceAsStream("/fixtures/wger/exercise-page.json"), StandardCharsets.UTF_8);
        server.expect(requestTo("https://wger.de/api/v2/exerciseinfo/?limit=2&offset=0"))
                .andRespond(withSuccess(fixture, MediaType.APPLICATION_JSON));
        var properties = new WgerProperties(true, "https://wger.de/api/v2", "pt-br", "en", 15, 2, 0, 60);

        var page = new WgerExerciseClient(builder.build(), properties).exercises(0);

        assertThat(page.count()).isOne();
        assertThat(page.results()).singleElement().satisfies(item -> {
            assertThat(item.translations()).hasSize(2);
            assertThat(item.images()).hasSize(1);
            assertThat(item.videos()).hasSize(2);
        });
        server.verify();
    }

    @Test
    void parsesRealRegionalLanguageCodesWithoutCallingWger() throws Exception {
        var builder = RestClient.builder().baseUrl("https://wger.de/api/v2");
        var server = MockRestServiceServer.bindTo(builder).build();
        String fixture = StreamUtils.copyToString(
                getClass().getResourceAsStream("/fixtures/wger/language-page.json"), StandardCharsets.UTF_8);
        server.expect(requestTo("https://wger.de/api/v2/language/?limit=100"))
                .andRespond(withSuccess(fixture, MediaType.APPLICATION_JSON));
        var properties = new WgerProperties(true, "https://wger.de/api/v2", "pt-br", "en", 15, 2, 0, 60);

        var languages = new WgerExerciseClient(builder.build(), properties).languages();

        assertThat(languages.results()).extracting(language -> language.shortName())
                .containsExactly("pt-br", "pt", "en");
        server.verify();
    }
}
