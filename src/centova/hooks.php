<?php 

class PluginHooks_register_song extends PluginHooks {

    const FANTOME_API_URL = "";
    const FANTOME_JWT_KEY = "";

    public function install_hooks() {
        PluginHooks::register('playlist_advanced', array(&$this,'registerSong'));
    }

    public function registerSong($username, $pathname, $artist, $album, $title, $length, $royaltycode) {
        try {
            $this->postSong($this->getToken(), $artist, $title);
        } catch (Exception $e) {
            /* swallow the exception */
        }

        return PluginHooks::OK;
    }

    private function postSong(string $token, string $artist, string $title) {
        // Define the URL you want to send the POST request to.
        $url = $this::FANTOME_API_URL;
    
        // Define the data you want to send in the POST request as an associative array.
        $data = [
            'name' => $title,
            'artist' => $artist,
        ];
    
        // Encode the data as JSON.
        $jsonData = json_encode($data);
    
        // Create an associative array with the HTTP headers, setting the content type to JSON.
        $headers = [
            'Content-type: application/json',
            'Authorization: ' . $token
        ];
    
        // Create the context options for the stream context.
        $options = [
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", $headers),
                'content' => $jsonData,
            ],
        ];
    
        // Create the stream context.
        $context = stream_context_create($options);
    
        // Send the POST request and capture the response.
        file_get_contents($url, false, $context);
    }

    private function getToken() {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);

        // Create token payload as a JSON string
        $payload = json_encode([
            'client' => 'centova',
            'iat' => time(),
            'exp' => time() + 30
        ]);

        // Encode Header to Base64Url String
        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));

        // Encode Payload to Base64Url String
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

        // Create Signature Hash
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $this::FANTOME_JWT_KEY, true);

        // Encode Signature to Base64Url String
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        // Create JWT
        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }
}
