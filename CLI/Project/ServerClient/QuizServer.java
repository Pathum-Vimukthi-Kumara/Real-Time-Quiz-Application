package ServerClient;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Enumeration;
import java.util.List;
import java.util.Locale;
import java.util.Scanner;
import java.util.concurrent.CopyOnWriteArrayList;

public class QuizServer {

    private static final int DEFAULT_PORT = 8888;

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.println("\t\t LAN Quiz Host Server");
        System.out.println("\t\t====================\n");

        int port = askInt(scanner, "Enter port (default 8888): ", DEFAULT_PORT, 1024, 65535);
        printHostIPs(port);
        int questionCount = askInt(scanner, "Number of MCQ questions: ", 5, 1, 100);

        List<Question> questions = new ArrayList<>();
        for (int i = 1; i <= questionCount; i++) {
            System.out.println("\nCreate Question " + i + ":");
            System.out.print("Question text: ");
            String text = sanitize(scanner.nextLine());

            String[] options = new String[4];
            options[0] = askNonEmpty(scanner, "Option A: ");
            options[1] = askNonEmpty(scanner, "Option B: ");
            options[2] = askNonEmpty(scanner, "Option C: ");
            options[3] = askNonEmpty(scanner, "Option D: ");

            String correct = askAnswer(scanner, "Correct option (A/B/C/D): ");
            int timeLimitSeconds = askInt(scanner, "Time limit in seconds: ", 20, 5, 300);

            questions.add(new Question(text, options, correct, timeLimitSeconds));
        }

        QuizEngine engine = new QuizEngine(port, questions);
        engine.start(scanner);
    }

    private static int askInt(Scanner scanner, String prompt, int defaultValue, int min, int max) {
        while (true) {
            System.out.print(prompt);
            String line = scanner.nextLine().trim();
            if (line.isEmpty()) {
                return defaultValue;
            }
            try {
                int value = Integer.parseInt(line);
                if (value < min || value > max) {
                    System.out.println("Enter a value between " + min + " and " + max + ".");
                    continue;
                }
                return value;
            } catch (NumberFormatException ex) {
                System.out.println("Invalid number.");
            }
        }
    }

    private static String askNonEmpty(Scanner scanner, String prompt) {
        while (true) {
            System.out.print(prompt);
            String value = sanitize(scanner.nextLine());
            if (!value.isEmpty()) {
                return value;
            }
            System.out.println("Value cannot be empty.");
        }
    }

    private static String askAnswer(Scanner scanner, String prompt) {
        while (true) {
            System.out.print(prompt);
            String value = scanner.nextLine().trim().toUpperCase(Locale.ROOT);
            if (value.equals("A") || value.equals("B") || value.equals("C") || value.equals("D")) {
                return value;
            }
            System.out.println("Only A, B, C or D allowed.");
        }
    }

    private static String sanitize(String text) {
        return text == null ? "" : text.replace('|', '/').trim();
    }

    private static void printHostIPs(int port) {
        try {
            System.out.println("Host LAN IPv4 addresses:");
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface networkInterface = interfaces.nextElement();
                if (!networkInterface.isUp() || networkInterface.isLoopback()) {
                    continue;
                }

                Enumeration<InetAddress> addresses = networkInterface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress address = addresses.nextElement();
                    if (address instanceof Inet4Address && !address.isLoopbackAddress()) {
                        System.out.println("- " + address.getHostAddress() + ":" + port + " ("
                            + networkInterface.getDisplayName() + ")");
                    }
                }
            }
            System.out.println();
        } catch (IOException ex) {
            System.out.println("Could not detect host IP addresses: " + ex.getMessage());
        }
    }

    private static class Question {
        private final String text;
        private final String[] options;
        private final String correctAnswer;
        private final int timeLimitSeconds;

        private Question(String text, String[] options, String correctAnswer, int timeLimitSeconds) {
            this.text = text;
            this.options = options;
            this.correctAnswer = correctAnswer;
            this.timeLimitSeconds = timeLimitSeconds;
        }
    }

    private static class Participant {
        private final Socket socket;
        private final BufferedReader in;
        private final PrintWriter out;
        private String name;
        private int correctCount;
        private long totalAnswerTimeMillis;
        private int finalScore;

        private Participant(Socket socket) throws IOException {
            this.socket = socket;
            this.in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            this.out = new PrintWriter(socket.getOutputStream(), true);
        }

        private boolean handshake() {
            try {
                out.println("WELCOME|You joined the LAN quiz host.");
                out.println("NAME_REQ|Enter your display name");

                String line = in.readLine();
                if (line == null || !line.startsWith("NAME|")) {
                    out.println("ERROR|Invalid name message. Connection closed.");
                    close();
                    return false;
                }

                String receivedName = sanitize(line.substring(5));
                if (receivedName.isEmpty()) {
                    receivedName = "Player";
                }
                name = receivedName;
                out.println("JOINED|Welcome " + name);
                return true;
            } catch (IOException ex) {
                close();
                return false;
            }
        }

        private synchronized AnswerResult askQuestion(Question question, int index, int total) {
            long start = System.currentTimeMillis();
            try {
                socket.setSoTimeout(question.timeLimitSeconds * 1000);
                out.println("QUESTION|" + index + "|" + total + "|" + question.text + "|"
                    + question.options[0] + "|" + question.options[1] + "|" + question.options[2] + "|"
                    + question.options[3] + "|" + question.timeLimitSeconds);

                String line = in.readLine();
                long spent = System.currentTimeMillis() - start;

                if (line == null || !line.startsWith("ANSWER|")) {
                    return new AnswerResult(false, Math.min(spent, question.timeLimitSeconds * 1000L));
                }

                String answer = line.substring(7).trim().toUpperCase(Locale.ROOT);
                boolean correct = answer.equals(question.correctAnswer);
                return new AnswerResult(correct, Math.min(spent, question.timeLimitSeconds * 1000L));
            } catch (SocketTimeoutException timeoutException) {
                return new AnswerResult(false, question.timeLimitSeconds * 1000L);
            } catch (IOException ex) {
                return new AnswerResult(false, question.timeLimitSeconds * 1000L);
            } finally {
                try {
                    socket.setSoTimeout(0);
                } catch (IOException ignored) {
                }
            }
        }

        private void send(String message) {
            out.println(message);
        }

        private void close() {
            try {
                socket.close();
            } catch (IOException ignored) {
            }
        }
    }

    private static class AnswerResult {
        private final boolean correct;
        private final long spentMillis;

        private AnswerResult(boolean correct, long spentMillis) {
            this.correct = correct;
            this.spentMillis = spentMillis;
        }
    }

    private static class QuizEngine {
        private final int port;
        private final List<Question> questions;
        private final List<Participant> participants = new CopyOnWriteArrayList<>();
        private volatile boolean accepting = true;

        private QuizEngine(int port, List<Question> questions) {
            this.port = port;
            this.questions = questions;
        }

        private void start(Scanner scanner) {
            try (ServerSocket serverSocket = new ServerSocket(port)) {
                System.out.println("\nQuiz host started on port " + port + ".");
                System.out.println("Players can join from LAN now.");
                System.out.println("Type 'start' when ready to begin quiz.\n");

                Thread acceptThread = new Thread(() -> acceptParticipants(serverSocket));
                acceptThread.start();

                while (true) {
                    String command = scanner.nextLine().trim().toLowerCase(Locale.ROOT);
                    if (command.equals("start")) {
                        break;
                    }
                    System.out.println("Unknown command. Type 'start' to begin.");
                }

                accepting = false;
                serverSocket.close();
                try {
                    acceptThread.join(1000);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }

                if (participants.isEmpty()) {
                    System.out.println("No players connected. Exiting.");
                    return;
                }

                runQuiz();
                announceResults();
                closeAll();

            } catch (IOException ex) {
                System.out.println("Server error: " + ex.getMessage());
            }
        }

        private void acceptParticipants(ServerSocket serverSocket) {
            while (accepting) {
                try {
                    Socket socket = serverSocket.accept();
                    Participant participant = new Participant(socket);
                    if (participant.handshake()) {
                        participants.add(participant);
                        broadcast("INFO|" + participant.name + " joined. Total players: " + participants.size());
                        System.out.println(participant.name + " connected from " + socket.getInetAddress().getHostAddress());
                    }
                } catch (IOException ex) {
                    if (accepting) {
                        System.out.println("Accept error: " + ex.getMessage());
                    }
                }
            }
        }

        private void runQuiz() {
            int totalQuizSeconds = 0;
            for (Question question : questions) {
                totalQuizSeconds += question.timeLimitSeconds;
            }

            broadcast("QUIZ_START|" + questions.size());
            System.out.println("\nQuiz started with " + participants.size() + " players.");

            for (int i = 0; i < questions.size(); i++) {
                Question question = questions.get(i);
                int questionNo = i + 1;
                System.out.println("Running question " + questionNo + "/" + questions.size());

                List<Thread> workers = new ArrayList<>();
                for (Participant participant : participants) {
                    Thread worker = new Thread(() -> {
                        AnswerResult result = participant.askQuestion(question, questionNo, questions.size());
                        participant.totalAnswerTimeMillis += result.spentMillis;
                        if (result.correct) {
                            participant.correctCount++;
                            participant.send("RESULT|Q" + questionNo + "|Correct|" + (result.spentMillis / 1000.0) + "s");
                        } else {
                            participant.send("RESULT|Q" + questionNo + "|Wrong|" + (result.spentMillis / 1000.0)
                                + "s|Correct was " + question.correctAnswer);
                        }
                    });
                    workers.add(worker);
                    worker.start();
                }

                for (Thread worker : workers) {
                    try {
                        worker.join();
                    } catch (InterruptedException ignored) {
                        Thread.currentThread().interrupt();
                    }
                }
            }

            for (Participant participant : participants) {
                int speedPoints = (int) Math.max(0,
                    (totalQuizSeconds - (participant.totalAnswerTimeMillis / 1000.0)) * 2);
                participant.finalScore = (participant.correctCount * 100) + speedPoints;
            }
        }

        private void announceResults() {
            List<Participant> ranking = new ArrayList<>(participants);
            ranking.sort(Comparator.comparingInt((Participant p) -> p.finalScore).reversed());

            broadcast("QUIZ_END|Show final scoreboard");
            System.out.println("\nFinal Results");
            System.out.println("=============");

            for (int i = 0; i < ranking.size(); i++) {
                Participant p = ranking.get(i);
                String row = (i + 1) + ". " + p.name + " | score=" + p.finalScore + " | correct=" + p.correctCount
                    + " | time=" + String.format(Locale.ROOT, "%.2f", p.totalAnswerTimeMillis / 1000.0) + "s";

                System.out.println(row);
                p.send("SCORE|" + row);
            }
        }

        private void broadcast(String message) {
            for (Participant participant : participants) {
                participant.send(message);
            }
        }

        private void closeAll() {
            for (Participant participant : participants) {
                participant.close();
            }
        }
    }
}
