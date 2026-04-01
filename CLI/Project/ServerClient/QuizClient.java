package ServerClient;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;
import java.util.Locale;
import java.util.Scanner;

public class QuizClient {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.println("\t\t LAN Quiz Client");
        System.out.println("\t\t===============\n");

        System.out.print("Enter host IP (example 192.168.1.10): ");
        String host = scanner.nextLine().trim();
        if (host.isEmpty()) {
            host = "127.0.0.1";
        }

        System.out.print("Enter host port (default 8888): ");
        String portInput = scanner.nextLine().trim();
        int port = portInput.isEmpty() ? 8888 : Integer.parseInt(portInput);

        try (Socket socket = new Socket(host, port);
             BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
             PrintWriter out = new PrintWriter(socket.getOutputStream(), true)) {

            System.out.println("Connected to quiz host.\n");

            while (true) {
                String line = in.readLine();
                if (line == null) {
                    System.out.println("Server disconnected.");
                    break;
                }

                if (line.startsWith("WELCOME|")) {
                    System.out.println(line.substring(8));
                } else if (line.startsWith("NAME_REQ|")) {
                    System.out.print("Enter your name: ");
                    String name = sanitize(scanner.nextLine());
                    if (name.isEmpty()) {
                        name = "Player";
                    }
                    out.println("NAME|" + name);
                } else if (line.startsWith("JOINED|")) {
                    System.out.println(line.substring(7));
                } else if (line.startsWith("INFO|")) {
                    System.out.println("[Info] " + line.substring(5));
                } else if (line.startsWith("QUIZ_START|")) {
                    System.out.println("\nQuiz is starting now. Good luck!");
                } else if (line.startsWith("QUESTION|")) {
                    handleQuestion(line, scanner, out);
                } else if (line.startsWith("RESULT|")) {
                    System.out.println(line.substring(7));
                } else if (line.startsWith("QUIZ_END|")) {
                    System.out.println("\nQuiz ended. Final ranking:");
                } else if (line.startsWith("SCORE|")) {
                    System.out.println(line.substring(6));
                } else if (line.startsWith("ERROR|")) {
                    System.out.println("Server error: " + line.substring(6));
                    break;
                } else {
                    System.out.println("Server: " + line);
                }
            }

        } catch (IOException ex) {
            System.out.println("Connection error: " + ex.getMessage());
        }
    }

    private static void handleQuestion(String packet, Scanner scanner, PrintWriter out) {
        String[] parts = packet.split("\\|", -1);
        if (parts.length < 9) {
            System.out.println("Invalid question format from server.");
            out.println("ANSWER|X");
            return;
        }

        String number = parts[1];
        String total = parts[2];
        String questionText = parts[3];
        String optionA = parts[4];
        String optionB = parts[5];
        String optionC = parts[6];
        String optionD = parts[7];
        String timeLimit = parts[8];

        System.out.println("\nQuestion " + number + "/" + total + " (" + timeLimit + "s)");
        System.out.println(questionText);
        System.out.println("A) " + optionA);
        System.out.println("B) " + optionB);
        System.out.println("C) " + optionC);
        System.out.println("D) " + optionD);

        String answer;
        while (true) {
            System.out.print("Your answer (A/B/C/D): ");
            answer = scanner.nextLine().trim().toUpperCase(Locale.ROOT);
            if (answer.equals("A") || answer.equals("B") || answer.equals("C") || answer.equals("D")) {
                break;
            }
            System.out.println("Please enter A, B, C or D.");
        }

        out.println("ANSWER|" + answer);
    }

    private static String sanitize(String text) {
        return text == null ? "" : text.replace('|', '/').trim();
    }
}
