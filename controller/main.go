package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/gorilla/handlers"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	nodeURL      = "http://node-backend:3000/start"
	goURL        = "http://go-backend:5000/start"
	nodeStopURL  = "http://node-backend:3000/stop"
	goStopURL    = "http://go-backend:5000/stop"
	mu           sync.Mutex
	status       int
	mongoClient  *mongo.Client
	attacksCollection *mongo.Collection
)

func main() {
	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	var err error
	mongoClient, err = mongo.Connect(ctx, options.Client().ApplyURI("mongodb://mongodb:27017"))
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}
	
	attacksCollection = mongoClient.Database("backendbrawl").Collection("attacks")
	
	r := mux.NewRouter()

	cors := handlers.CORS(
        handlers.AllowedOrigins([]string{
            "http://localhost",
            "http://localhost:80",
        }),
        handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
        handlers.AllowedHeaders([]string{"Content-Type"}),
    )

	r.HandleFunc("/start-game", startGame).Methods("GET")
	
	log.Fatal(http.ListenAndServe(":7000", cors(r)))
}

func startGame(w http.ResponseWriter, r *http.Request) {
    mu.Lock()
    defer mu.Unlock()
    
    if status != 0 {
        w.WriteHeader(http.StatusTooManyRequests)
        w.Write([]byte("Please wait until the current attack completes"))
        return
    }
    
    status = 1
    defer func() { status = 0 }()

    // Clear previous attacks
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    _, err := attacksCollection.DeleteMany(ctx, bson.D{})
    if err != nil {
        log.Println("Failed to clear previous attacks:", err)
        w.WriteHeader(http.StatusInternalServerError)
        return
    }


    http.Get(nodeURL)
    http.Get(goURL)


    time.Sleep(1 * time.Second)


    http.Get(nodeStopURL)
    http.Get(goStopURL)
    
    // Get all attacks
    ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    findOptions := options.Find().SetSort(bson.D{{Key: "timestampNs", Value: 1}})
    cursor, err := attacksCollection.Find(ctx, bson.D{}, findOptions)
    if err != nil {
        log.Println("Failed to fetch attacks:", err)
        w.WriteHeader(http.StatusInternalServerError)
        return
    }
    defer cursor.Close(ctx)

    var attacks []struct {
        Timestamp   int64  `bson:"timestamp"`
        Server      string `bson:"server"`
        TimestampNs int64  `bson:"timestampNs"`
    }

    if err = cursor.All(ctx, &attacks); err != nil {
        log.Println("Failed to decode attacks:", err)
        w.WriteHeader(http.StatusInternalServerError)
        return
    }

    type AttackResponse struct {
        Timestamp string `json:"timestamp"`
        Server    string `json:"server"`
    }

    response := make([]AttackResponse, len(attacks))
    for i, a := range attacks {
        response[i] = AttackResponse{
            Timestamp: strconv.FormatInt(a.Timestamp, 10),
            Server:    a.Server,
        }
    }

    jsonData, err := json.Marshal(response)
    if err != nil {
        log.Println("Failed to marshal response:", err)
        w.WriteHeader(http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    w.Write(jsonData)
}