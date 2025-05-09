package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const nodeURL string = "http://node-backend:3000/attack"

var (
	mongoClient *mongo.Client
	isActive bool
)

func main() {
	initMongoDB()
	defer mongoClient.Disconnect(context.Background())
	r := mux.NewRouter()
	r.HandleFunc("/start", serveStart).Methods("GET")
	r.HandleFunc("/attack", serveAttack).Methods("GET")
	r.HandleFunc("/stop", serveStop).Methods("GET")

	log.Fatal(http.ListenAndServe(":5000", r))
}

func initMongoDB() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var err error
	mongoClient, err = mongo.Connect(ctx, options.Client().ApplyURI("mongodb://mongodb:27017"))
	if err != nil {
		log.Fatal("MongoDB connection failed:", err)
	}

	// Verify MongoDB connection
	err = mongoClient.Ping(ctx, nil)
	if err != nil {
		log.Fatal("MongoDB ping failed:", err)
	}
}

func recordAttack() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := mongoClient.Database("backendbrawl").Collection("attacks")
	_, err := collection.InsertOne(ctx, map[string]any{
		"timestamp": time.Now().UnixNano(),
		"server":    "go",
	})
	if err != nil {
		log.Println("MongoDB error:", err)
	}
}

func serveAttack(w http.ResponseWriter, r *http.Request) {
	if isActive {
		recordAttack()
		go func() {
			http.Get(nodeURL)
		}()
	}
	w.WriteHeader(http.StatusNoContent)
}

func serveStart(w http.ResponseWriter, r *http.Request) {
	isActive = true
	go func() {
		http.Get(nodeURL)
	}()
	w.WriteHeader(http.StatusNoContent)
}

func serveStop(w http.ResponseWriter, r *http.Request) {
	isActive = false
	w.WriteHeader(http.StatusNoContent)
}