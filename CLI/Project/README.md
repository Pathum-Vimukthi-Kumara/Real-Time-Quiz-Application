# LAN Quiz Application (TCP)

This project contains a simple LAN-based MCQ quiz system built with Java sockets.

## Files

- `ServerClient/QuizServer.java`: Host-side application (quiz creator + server)
- `ServerClient/QuizClient.java`: Player-side application (quiz participant)

## Features

- Host creates MCQ questions from terminal input
- Multiple clients can join over LAN
- Each question has a time limit
- Score is based on correctness and speed
- Final ranking is shown to all participants

## Score Logic

For each player:

- `correctPoints = correctAnswers * 100`
- `speedPoints = max(0, (totalQuizTimeSeconds - spentTimeSeconds) * 2)`
- `finalScore = correctPoints + speedPoints`

## Requirements

- Java JDK 8 or above
- All devices connected to the same LAN

## Compile

Open terminal in the `Project` folder and run:

```powershell
javac -d . ServerClient/*.java
```

This places compiled classes into the package folder (`ServerClient`) required by Java runtime.

## Run

### 1. Start host/server (quiz creator)

```powershell
java ServerClient.QuizServer
```

- Enter port (default: `8888`)
- Server prints detected LAN IPv4 addresses; use one of those IPs in clients
- Enter questions/options/correct answer/time limit
- Wait for players to join
- Type `start` to begin quiz

### 2. Start each client/player

```powershell
java ServerClient.QuizClient
```

- Enter host IP (for LAN use server machine IP, e.g. `192.168.1.10`)
- Enter host port (same as server)
- Enter name and answer each question

## How to find host LAN IP (Windows)

On server machine:

```powershell
ipconfig
```

Use the IPv4 address of the active network adapter.

## Notes

- Do not use `127.0.0.1` for clients on other machines.
- Ensure firewall allows Java on the selected port.
- Input characters `|` are sanitized internally to keep protocol stable.
